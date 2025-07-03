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
import { UpdateAttendanceDto } from 'src/domain/attendance/dto/update-attendance.dto';
import { AttendanceStatusDto } from 'src/domain/attendance/dto/upsert-attendance.dto';
import {
  IAttendance,
  IAttendanceKey,
  IAttendanceWithLastFlag,
} from 'src/domain/attendance/entities/attendance.interface';
import { AttendanceReport } from 'src/domain/attendance/types/attendance.types';
import {
  generateDailyStudentKey,
  generateGroupKey,
  getOneYearTtl,
  processAttendanceReport,
} from 'src/domain/attendance/utils/attendance.utils';
import { Group } from 'src/domain/group/entities/group.entity';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { getDuration } from 'src/helpers/time';
import { NotificationService } from 'src/services/notification/notification.service';
import { In, Repository } from 'typeorm';

@Injectable()
export class GroupAttendanceService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Pick)
    private readonly pickRepository: Repository<Pick>,
    @InjectRepository(Schoolday)
    private readonly schooldayRepository: Repository<Schoolday>,
    @InjectModel('Attendance')
    private readonly model: Model<IAttendance, IAttendanceKey>,
    private readonly notificationService: NotificationService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Notify
  //? 미발송 case 들은 아래 문서를 참고.
  //? https://www.notion.so/v3-DynamoDB-1fb4351cd47a80519649db17d05763d2
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
    const studentIds = dtos
      .filter((v) => v.status !== AttendanceStatus.INIT)
      .filter((v) => v.status !== AttendanceStatus.ABSENT)
      .filter((v) => v.status !== AttendanceStatus.EXCUSED_ABSENT)
      .filter((v) => v.status !== AttendanceStatus.EXCUSED_LATE)
      .map((v) => this.extractStudentIdFromRangeKey(v.dailyStudentKey));
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
          body: `${v.name} 학생 ${group.lesson.lessonName} : ${statusMap.get(v.id)}`,
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

    // 수업시작문자 발송시각 업데이트
    if (dtos.length > 0) {
      const date = dtos[0].dailyStudentKey.split('#')[1]; // "DATE#2025-06-16#STUDENT#..." -> "2025-06-16"
      await this.schooldayRepository
        .createQueryBuilder()
        .update(Schoolday)
        .set({ startNotifiedAt: new Date() })
        .where('groupId = :groupId', { groupId })
        .andWhere('DATE(startsAt) = :date', { date })
        .execute();
    }

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
    const studentIds = dtos
      .filter((v) => v.status !== AttendanceStatus.INIT)
      .filter((v) => v.status !== AttendanceStatus.LEFT)
      .filter((v) => v.status !== AttendanceStatus.EXCUSED_ABSENT)
      .filter((v) => v.status !== AttendanceStatus.EXCUSED_LEFT)
      .map((v) => this.extractStudentIdFromRangeKey(v.dailyStudentKey));
    const statusMap = new Map<number, string>();
    dtos.forEach((dto) => {
      statusMap.set(
        this.extractStudentIdFromRangeKey(dto.dailyStudentKey),
        this.translateStatusInOtherContext(dto.status),
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
          body: `${v.name} 학생 ${group.lesson.lessonName} : ${statusMap.get(v.id)}`,
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

    // 수업종료문자 발송시각 업데이트
    if (dtos.length > 0) {
      const date = dtos[0].dailyStudentKey.split('#')[1]; // "DATE#2025-06-16#STUDENT#..." -> "2025-06-16"
      await this.schooldayRepository
        .createQueryBuilder()
        .update(Schoolday)
        .set({ endNotifiedAt: new Date() })
        .where('groupId = :groupId', { groupId })
        .andWhere('DATE(startsAt) = :date', { date })
        .execute();
    }

    return messages.length;
  }

  async notifyCustom(
    groupId: number,
    dtos: AttendanceStatusDto[],
  ): Promise<number> {
    if (dtos.length === 0) {
      return 0;
    }

    // 첫 번째 DTO에서 groupId 추출
    // const groupId = Number(dtos[0].groupKey.split('#')[1]);

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

    // Custom message를 위한 학생 ID와 메시지 매핑
    const studentMessageMap = new Map<number, string>();
    const statusMap = new Map<number, string>();

    dtos.forEach((dto) => {
      const studentId = this.extractStudentIdFromRangeKey(dto.dailyStudentKey);
      const message = dto.schoolNote || '';
      studentMessageMap.set(studentId, message);
      statusMap.set(studentId, this.translateStatusInOtherContext(dto.status));
    });

    const studentIds = Array.from(studentMessageMap.keys());

    const messages = allStudents
      .filter((v) => studentIds.includes(v.id))
      .map((v: Student) => {
        const customMessage = studentMessageMap.get(v.id);
        const status = statusMap.get(v.id);
        return {
          id: v.parent.id,
          phone: v.parent.phone,
          token: v.parent.user?.pushToken ?? null,
          title: `${group.lesson.schoolName}`,
          body: `${v.name} 학생 ${status} : ${customMessage}`,
          role: 'PARENT',
        };
      });

    // Dynamo 상태 업데이트 (customMessage를 schoolNote로 저장)
    const updatedDtos = dtos.map((dto) => ({
      ...dto,
      schoolNote: dto.schoolNote,
    }));

    await this.updateAttendanceStatusInBulkOptimized(updatedDtos);

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
      throw new NotFoundException('해당일에 수업이 없습니다.');
    }

    const duration = getDuration(group.start, group.end);
    const expires = getOneYearTtl(new Date());
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
          throw new BadRequestException('출석 정보 업데이트에 실패했습니다.');
        }
      } else {
        console.error(`[dynamodb] update error`, error);
        throw new BadRequestException('출석 정보 생성에 실패했습니다.');
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

      // Ensure all fields are present (MySQL-like behavior)
      return (result as IAttendance[]).map((item) => ({
        ...item,
        parentNote: item.parentNote ?? null,
        schoolNote: item.schoolNote ?? null,
      }));
    } catch (error) {
      console.error(`[dynamodb] error`, error);
      throw new BadRequestException('출석 정보 조회에 실패했습니다.');
    }
  }

  /**
   * 지정된 날짜의 출석 정보를 확장된 데이터와 함께 조회합니다.
   *
   * @description
   * 기본 출석 정보에 추가로 다음 정보들을 포함합니다:
   * - student: Student entity (부모 정보 포함)
   * - isLast: 해당 학생의 당일 마지막 수업 여부
   *
   * @param groupKey DynamoDB 그룹 키 (e.g., "GROUP#48")
   * @param date 조회할 날짜 (e.g., "2025-06-08")
   *
   * @returns IAttendanceWithLastFlag[]
   * - 기본 출석 정보 + student entity + isLast 플래그
   * - student: { id, name, grade, class, studentCode, parent }
   * - isLast: boolean (해당 학생의 당일 마지막 수업 여부)
   *
   * @performance
   * - MySQL 쿼리 최적화: IN 조건으로 모든 학생 정보를 한 번에 조회
   * - 메모리 최적화: Map을 사용한 O(1) lookup
   * - N+1 쿼리 방지
   */
  async findAttendancesByDateWithExtendedData(
    groupKey: string,
    date: string,
  ): Promise<IAttendanceWithLastFlag[]> {
    try {
      // 1. DynamoDB에서 출석 데이터 조회
      const prefix = `DATE#${date}`;
      const items: IAttendance[] = await this.model
        .query('groupKey')
        .eq(groupKey)
        .where('dailyStudentKey')
        .beginsWith(prefix)
        .exec();

      if (items.length === 0) {
        return [];
      }

      // 2. 학생 ID 추출 및 현재 그룹 ID 추출
      const studentIds = items.map((v) =>
        this.extractStudentIdFromRangeKey(v.dailyStudentKey),
      );
      const groupId = Number(groupKey.split('#')[1]);

      // 3. 한 번의 쿼리로 모든 학생 정보 조회 (부모 정보 포함)
      const students = await this.studentRepository.find({
        where: { id: In(studentIds) },
        relations: ['parent'],
        select: ['id', 'name', 'grade', 'class', 'studentCode', 'parent'],
      });

      // 학생 ID를 key로 하는 Map 생성 (빠른 lookup을 위해)
      // 각 student entity는 response에서 student 필드로 반환됨
      const studentMap = new Map(
        students.map((student) => [student.id, student]),
      );

      // 4. 한 번의 최적화된 쿼리로 각 학생의 해당 날짜 모든 그룹 스케줄 조회
      const studentScheduleData: {
        studentId: number;
        groupId: number;
        endsAt: string;
      }[] = await this.pickRepository
        .createQueryBuilder('pick')
        .innerJoin('pick.group', 'group')
        .innerJoin('group.schooldays', 'schoolday')
        .select([
          'pick.studentId as studentId',
          'group.id as groupId',
          'schoolday.endsAt as endsAt',
        ])
        .where('pick.studentId IN (:...studentIds)', { studentIds })
        .andWhere('DATE(schoolday.startsAt) = :targetDate', {
          targetDate: date,
        })
        .orderBy('pick.studentId')
        .addOrderBy('schoolday.endsAt', 'DESC')
        .getRawMany();

      // 4. 메모리에서 학생별 마지막 그룹 정보 계산
      const studentLastGroupMap = new Map<number, boolean>();

      // 학생별로 그룹핑하여 각 학생의 마지막 그룹 ID 찾기
      const studentGroups = studentScheduleData.reduce(
        (acc, row) => {
          const studentId = row.studentId;
          if (!acc[studentId]) acc[studentId] = [];
          acc[studentId].push({
            groupId: row.groupId,
            endsAt: row.endsAt,
          });
          return acc;
        },
        {} as Record<number, { groupId: number; endsAt: string }[]>,
      );

      // 각 학생의 마지막 그룹이 현재 그룹인지 확인
      studentIds.forEach((studentId) => {
        const schedule = studentGroups[studentId] || [];
        const lastGroup = schedule[0]; // 이미 endsAt DESC로 정렬되어 첫 번째가 마지막 그룹
        studentLastGroupMap.set(studentId, lastGroup?.groupId === groupId);
      });

      // 5. 출석 데이터와 확장 정보 결합 (student entity + isLast 플래그)
      const attendancesWithLastFlag: IAttendanceWithLastFlag[] = items.map(
        (item) => {
          const studentId = this.extractStudentIdFromRangeKey(
            item.dailyStudentKey,
          );
          return {
            ...item,
            // Ensure all fields are present (MySQL-like behavior)
            parentNote: item.parentNote ?? null,
            schoolNote: item.schoolNote ?? null,
            student: studentMap.get(studentId), // Student entity (부모 정보 포함)
            isLast: studentLastGroupMap.get(studentId) ?? false, // 당일 마지막 수업 여부
          };
        },
      );

      return attendancesWithLastFlag;
    } catch (error) {
      console.error(`[dynamodb] optimized query error`, error);
      throw new BadRequestException('출석 정보 조회에 실패했습니다.');
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
          {
            status: dto.status,
            ...(dto.schoolNote !== undefined && { schoolNote: dto.schoolNote }),
          },
        ),
      );
      const results = await Promise.all(updatePromises);
      console.log(
        `✅ Bulk updated ${results.length} attendance records (unconditional)`,
      );
      return results;
    } catch (error) {
      console.error(`[dynamodb] bulk update error`, error);
      throw new BadRequestException('출석 정보 일괄 업데이트에 실패했습니다.');
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
          {
            status: dto.status,
            ...(dto.schoolNote !== undefined && { schoolNote: dto.schoolNote }),
          },
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
      throw new BadRequestException(
        '출석 정보 최적화 일괄 업데이트에 실패했습니다.',
      );
    }
  }

  /**
   * Extract student IDs from DTOs
   * dailyStudentKey format: "DATE#2025-06-16#STUDENT#51#2-3-51" => 51
   */
  private extractStudentIdFromRangeKey(dailyStudentKey: string): number {
    const parts = dailyStudentKey.split('#');
    return Number(parts[3]);
  }

  private translateStatusInStartContext(status: AttendanceStatus): string {
    switch (status) {
      case AttendanceStatus.INIT:
        return '출석체크 이전';
      case AttendanceStatus.PRESENT:
        return '출석';
      case AttendanceStatus.ABSENT:
        return '미출석';
      case AttendanceStatus.LATE:
        return '미출석';
      case AttendanceStatus.LEFT:
        return '조퇴';
      case AttendanceStatus.EXCUSED_ABSENT:
        return '선통보 결석';
      case AttendanceStatus.EXCUSED_LATE:
        return '선통보 지각';
      case AttendanceStatus.EXCUSED_LEFT:
        return '선통보 조퇴';
      default:
        return '하교';
    }
  }

  private translateStatusInOtherContext(status: AttendanceStatus): string {
    switch (status) {
      case AttendanceStatus.INIT:
        return '출석채크 이전';
      case AttendanceStatus.PRESENT:
        return '종료';
      case AttendanceStatus.ABSENT:
        return '결석';
      case AttendanceStatus.LATE:
        return '지각';
      case AttendanceStatus.LEFT:
        return '조퇴';
      case AttendanceStatus.EXCUSED_ABSENT:
        return '결석 선통보';
      case AttendanceStatus.EXCUSED_LATE:
        return '지각 선통보';
      case AttendanceStatus.EXCUSED_LEFT:
        return '조퇴 선통보';
      default:
        return '하교';
    }
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
