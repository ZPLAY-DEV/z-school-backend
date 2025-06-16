import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { format, fromZonedTime } from 'date-fns-tz';
import { InjectModel, Model } from 'nestjs-dynamoose';
import { AttendanceStatus } from 'src/common/enums';
import { NotificationType } from 'src/common/enums/notification-type';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { UpdateAttendanceDto } from 'src/domain/attendance/dto/update-attendance.dto';
import { AttendanceStatusDto } from 'src/domain/attendance/dto/upsert-attendance.dto';
import {
  IAttendance,
  IAttendanceKey,
} from 'src/domain/attendance/entities/attendance.interface';
import { AttendanceReport } from 'src/domain/attendance/types/attendance.types';
import {
  calculateTtl,
  generateDailyStudentKey,
  generateGroupKey,
  processAttendanceReport,
} from 'src/domain/attendance/utils/attendance.utils';
import { Group } from 'src/domain/group/entities/group.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { getDuration } from 'src/helpers/time';
import { NotificationService } from 'src/services/notification/notification.service';
import { Repository } from 'typeorm';

@Injectable()
export class GroupAttendanceService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectModel('Attendance')
    private readonly model: Model<IAttendance, IAttendanceKey>,
    private readonly notificationService: NotificationService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Notify
  //? ---------------------------------------------------------------------- ?//

  async notifyStart(
    groupId: number, //! e.g. 48
    dtos: AttendanceStatusDto[],
  ): Promise<number> {
    const group = await this.groupRepository.findOneOrFail({
      where: { id: groupId },
      relations: [
        'lesson',
        'picks',
        'picks.student',
        'picks.student.parent',
        'picks.student.parent.user',
      ],
    });
    const allStudents = group.picks.map((v) => v.student);
    const studentIds = dtos.map((v) =>
      this.extractStudentIdFromRangeKey(v.dailyStudentKey),
    );
    const statusMap = new Map<number, string>();
    dtos.forEach((dto) => {
      statusMap.set(
        this.extractStudentIdFromRangeKey(dto.dailyStudentKey),
        this.translateStatusInStartContext(dto.status),
      );
    });
    const messages = allStudents
      .filter((v) => studentIds.includes(v.id))
      .map((v: Student) => {
        return {
          id: v.parent.id,
          phone: v.parent.phone,
          token: v.parent.user?.pushToken ?? null,
          title: `${group.lesson.schoolName}`,
          body: `${v.name} 학생이 ${group.lesson.lessonName} 수업 ${statusMap.get(v.id)}`,
          role: 'PARENT',
        };
      });
    // Dynamo 상태 업데이트 (무조건 모두 변경한다.)
    await this.updateAttendanceStatusInBulk(dtos);
    await this.notificationService.send({
      messages,
      type: NotificationType.CLASS,
      schoolId: group.lesson.schoolId,
      role: 'PARENT',
    });
    return messages.length;
  }

  async notifyEnd(
    groupId: number, //! e.g. 48
    dtos: AttendanceStatusDto[],
  ): Promise<number> {
    // MySQL 읽고
    const group = await this.groupRepository.findOneOrFail({
      where: { id: groupId },
      relations: [
        'lesson',
        'picks',
        'picks.student',
        'picks.student.parent',
        'picks.student.parent.user',
      ],
    });
    const allStudents = group.picks.map((v) => v.student);
    const studentIds = dtos.map((v) =>
      this.extractStudentIdFromRangeKey(v.dailyStudentKey),
    );
    const statusMap = new Map<number, string>();
    dtos.forEach((dto) => {
      statusMap.set(
        this.extractStudentIdFromRangeKey(dto.dailyStudentKey),
        this.translateStatusInEndContext(dto.status),
      );
    });
    const messages = allStudents
      .filter((v) => studentIds.includes(v.id))
      .map((v: Student) => {
        return {
          id: v.parent.id,
          phone: v.parent.phone,
          token: v.parent.user?.pushToken ?? null,
          title: `${group.lesson.schoolName}`,
          body: `${v.name} 학생이 ${group.lesson.lessonName} 수업 ${statusMap.get(v.id)}`,
          role: 'PARENT',
        };
      });
    // Dynamo 상태 업데이트 (변경이 필요한 것만 변경한다.)
    await this.updateAttendanceStatusInBulkOptimized(dtos);
    await this.notificationService.send({
      messages,
      type: NotificationType.CLASS,
      schoolId: group.lesson.schoolId,
      role: 'PARENT',
    });
    return messages.length;
  }

  //? ---------------------------------------------------------------------- ?//
  //? Create 또는 Update
  //? ---------------------------------------------------------------------- ?//

  async upsert(
    date: string, //! e.g. "2025-06-08" <- 하이픈 반드시 포함
    dto: UpdateAttendanceDto,
  ): Promise<IAttendance> {
    const group = await this.groupRepository.findOneOrFail({
      where: { id: dto.groupId },
      relations: ['lesson', 'schooldays'],
    });
    const student = await this.studentRepository.findOneOrFail({
      where: { id: dto.studentId },
    });
    const schoolday = group.schooldays.find(
      (v) =>
        format(fromZonedTime(v.startsAt, 'Asia/Seoul'), 'yyyy-MM-dd') ===
        `${date}`,
    );
    if (!schoolday) {
      throw new NotFoundException(HttpErrorConstants.NO_CLASS_DAY);
    }

    const duration = getDuration(group.start, group.end);
    const expires = calculateTtl(new Date());
    const groupKey = generateGroupKey(group.id);
    const dailyStudentKey = generateDailyStudentKey(
      date,
      student.id,
      student.grade,
      student.class,
      student.studentCode,
    );

    const itemKey = {
      groupKey,
      dailyStudentKey,
    };
    const itemDto = {
      ...dto, // status, parentNote, schoolNote, isRead
      lessonId: group.lessonId,
      lessonName: group.lesson.lessonName,
      groupId: group.id,
      groupName: group.groupName,
      studentId: student.id,
      studentName: student.name,
      start: group.start,
      end: group.end,
      duration: duration,
      expires: expires,
    };

    // intentionally using exception-driven control flow
    try {
      const result = await this.model.create({
        ...itemKey,
        ...itemDto,
      });
      console.log(
        '✅ created new attendance:',
        JSON.stringify(result, null, 2),
      );
      return result;
    } catch (error) {
      if (
        error.name === 'ConditionalCheckFailedException' ||
        error.code === 'ConditionalCheckFailedException'
      ) {
        try {
          const result = await this.model.update(itemKey, itemDto);
          console.log(
            '✅ updated existing attendance:',
            JSON.stringify(result, null, 2),
          );
          return result;
        } catch (updateError) {
          console.error(`[dynamodb] update error`, updateError);
          throw new BadRequestException(HttpErrorConstants.DYNAMO_UPDATE);
        }
      } else {
        console.error(`[dynamodb] update error`, error);
        throw new BadRequestException(HttpErrorConstants.DYNAMO_CREATE);
      }
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async findAttendancesByDate(
    groupKey: string,
    date: string,
  ): Promise<IAttendance[]> {
    try {
      const prefix = `DATE#${date}`;
      const result = await this.model
        .query('groupKey')
        .eq(groupKey)
        .where('dailyStudentKey')
        .beginsWith(prefix)
        .exec();
      return result as IAttendance[];
    } catch (error) {
      console.error(`[dynamodb] error`, error);
      throw new BadRequestException(HttpErrorConstants.DYNAMO_READ);
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Report
  //? ---------------------------------------------------------------------- ?//

  async getReport(groupKey: string, date: string): Promise<AttendanceReport[]> {
    const items = await this.findByDate(groupKey, date);
    return processAttendanceReport(items);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Utility Methods
  //? ---------------------------------------------------------------------- ?//

  /**
   * 기본 벌크 업데이트 - 모든 레코드를 무조건 업데이트
   *
   * 사용 시나리오:
   * - 대부분의 레코드가 변경될 것으로 예상되는 경우
   */
  async updateAttendanceStatusInBulk(
    dtos: AttendanceStatusDto[],
  ): Promise<IAttendance[]> {
    try {
      const updatePromises = dtos.map((dto) =>
        this.model.update(
          {
            groupKey: dto.groupKey,
            dailyStudentKey: dto.dailyStudentKey,
          },
          { status: dto.status },
        ),
      );
      const results = await Promise.all(updatePromises);
      console.log(
        `✅ Bulk updated ${results.length} attendance records (unconditional)`,
      );
      return results;
    } catch (error) {
      console.error(`[dynamodb] bulk update error`, error);
      throw new BadRequestException(HttpErrorConstants.DYNAMO_UPDATE);
    }
  }

  /**
   * WCU 최적화된 벌크 업데이트 - 실제로 상태가 변경되는 경우에만 update 실행
   *
   * 사용 시나리오:
   * - 변경률이 낮을 것으로 예상되는 경우 (변경률 < 80%)
   * - WCU 비용 절약이 중요한 경우
   * - 레코드 수가 많고 대부분 변경이 없을 것으로 예상되는 경우
   */
  async updateAttendanceStatusInBulkOptimized(
    dtos: AttendanceStatusDto[],
  ): Promise<{
    updatedCount: number;
    skippedCount: number;
    results: IAttendance[];
  }> {
    try {
      // 1. 현재 상태 조회
      const currentRecords = await Promise.all(
        dtos.map(async (dto) => {
          try {
            const record = await this.model.get({
              groupKey: dto.groupKey,
              dailyStudentKey: dto.dailyStudentKey,
            });
            return { dto, currentRecord: record };
          } catch {
            // 레코드가 없으면 새로 생성해야 하므로 업데이트 대상
            return { dto, currentRecord: null };
          }
        }),
      );

      // 2. 상태가 실제로 변경되는 것만 필터링
      const recordsToUpdate = currentRecords.filter(
        ({ dto, currentRecord }) =>
          !currentRecord || currentRecord.status !== dto.status,
      );

      if (recordsToUpdate.length === 0) {
        console.log(
          `⏭️ No status changes needed, skipping all ${dtos.length} records`,
        );
        return {
          updatedCount: 0,
          skippedCount: dtos.length,
          results: currentRecords
            .map((r) => r.currentRecord)
            .filter(Boolean) as IAttendance[],
        };
      }

      // 3. 변경이 필요한 것만 update 실행
      const updatePromises = recordsToUpdate.map(({ dto }) =>
        this.model.update(
          {
            groupKey: dto.groupKey,
            dailyStudentKey: dto.dailyStudentKey,
          },
          { status: dto.status },
        ),
      );

      const results = await Promise.all(updatePromises);
      const skippedCount = dtos.length - recordsToUpdate.length;

      console.log(
        `✅ Optimized bulk update: ${results.length} updated, ${skippedCount} skipped (WCU saved: ${skippedCount})`,
      );

      return {
        updatedCount: results.length,
        skippedCount,
        results,
      };
    } catch (error) {
      console.error(`[dynamodb] optimized bulk update error`, error);
      throw new BadRequestException(HttpErrorConstants.DYNAMO_UPDATE);
    }
  }

  /**
   * Extract student IDs from DTOs
   * dailyStudentKey format: "DATE#2025-06-16#STUDENT#51#2-3-51"
   */
  private extractStudentIdFromRangeKey(dailyStudentKey: string): number {
    const parts = dailyStudentKey.split('#');
    return Number(parts[3]);
  }

  private translateStatusInStartContext(status: AttendanceStatus): string {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return '출석함';
      case AttendanceStatus.LATE:
        return '미출석함';
      case AttendanceStatus.ABSENT:
        return '미출석함';
    }
    return '??'; // 이건 나오면 안된다.
  }

  private translateStatusInEndContext(status: AttendanceStatus): string {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return '마침';
      case AttendanceStatus.LATE:
        return '지각함';
      case AttendanceStatus.ABSENT:
        return '결석함';
    }
    return '??'; // 이건 나오면 안된다.
  }

  /**
   * Find attendance records by date
   */
  private async findByDate(
    groupKey: string,
    date: string,
  ): Promise<IAttendance[]> {
    return this.findAttendancesByDate(groupKey, date);
  }
}
