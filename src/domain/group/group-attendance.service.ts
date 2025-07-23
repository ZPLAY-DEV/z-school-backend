import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays } from 'date-fns';
import { format, fromZonedTime } from 'date-fns-tz';
import { InjectModel, Model } from 'nestjs-dynamoose';
import { AttendanceStatus } from 'src/common/enums';
import { NotificationType } from 'src/common/enums/notification-type';
import {
  CreateAttendanceWithGroupStudentDto,
  CreateAttendanceWithKeyDto,
} from 'src/domain/attendance/dto/upsert-attendance.dto';
import {
  IAttendance,
  IAttendanceKey,
  IAttendanceWithNextInfo,
} from 'src/domain/attendance/entities/attendance.interface';
import { AttendanceReport } from 'src/domain/attendance/types/attendance.types';
import {
  generateDailyStudentKey,
  generateGroupKey,
  getGroupIdFromGroupKey,
  processAttendanceReport,
} from 'src/domain/attendance/utils/attendance.utils';
import { Departure } from 'src/domain/departure/entities/departure.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { getDuration } from 'src/helpers/time';
import { NotificationService } from 'src/services/notification/notification.service';
import { In, IsNull, MoreThanOrEqual, Not, Repository } from 'typeorm';

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
    @InjectRepository(Departure)
    private readonly departureRepository: Repository<Departure>,
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
    dtos: CreateAttendanceWithKeyDto[],
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
    dtos: CreateAttendanceWithKeyDto[],
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
    dtos: CreateAttendanceWithKeyDto[],
  ): Promise<number> {
    console.log('🚀 [notifyCustom] Starting custom notification process');
    console.log('📊 [notifyCustom] Input params:', {
      groupId,
      dtosLength: dtos.length,
      dtos: dtos.map((dto) => ({
        dailyStudentKey: dto.dailyStudentKey,
        status: dto.status,
        schoolNote: dto.schoolNote || '조퇴합니다.',
        hasSchoolNote: !!dto.schoolNote,
      })),
    });

    // dtos가 없거나 비어있으면 조기 반환
    if (!dtos || dtos.length === 0) {
      console.log('⚠️ [notifyCustom] No DTOs provided, returning 0');
      return 0;
    }

    // 모든 dto의 groupId가 파라미터로 받은 groupId와 일치하는지 확인
    const groupIds = dtos.map((v) => +v.groupKey.split('#')[1]);
    const invalidGroupIds = groupIds.filter((id) => id !== groupId);

    if (invalidGroupIds.length > 0) {
      console.log('❌ [notifyCustom] Invalid group IDs found:', {
        expectedGroupId: groupId,
        foundGroupIds: groupIds,
        invalidGroupIds,
      });
      throw new BadRequestException(
        `잘못된 그룹 ID가 포함되어 있습니다. expected: ${groupId}, found: ${invalidGroupIds.join(', ')}`,
      );
    }

    try {
      // MySQL 읽고
      console.log('🔍 [notifyCustom] Fetching group data from MySQL...');
      const group = await this.groupRepository.findOneOrFail({
        where: { id: groupId },
        relations: [
          'lesson',
          'picks',
          'picks.student',
          'picks.student.parent',
          'picks.student.parent.user',
          'schooldays',
        ],
      });

      // DTOs에서 날짜 추출 및 검증
      const dtosDates = dtos.map((dto) =>
        this.extractDateFromRangeKey(dto.dailyStudentKey),
      );
      const uniqueDtosDates = [...new Set(dtosDates)];
      const validSchoolDates = group.schooldays.map((schoolday) => {
        const date = new Date(schoolday.startsAt);
        return date.toISOString().split('T')[0]; // YYYY-MM-DD 형식
      });
      const invalidDates = uniqueDtosDates.filter(
        (date) => !validSchoolDates.includes(date),
      );

      if (invalidDates.length > 0) {
        console.log('❌ [notifyCustom] Invalid dates found:', invalidDates);
        throw new BadRequestException(
          `다음 날짜들은 해당 그룹의 수업일이 아닙니다: ${invalidDates.join(', ')}`,
        );
      }

      const allStudents = group.picks.map((v) => v.student);
      const schoolNoteMap = new Map<number, string>();
      const statusMap = new Map<number, string>();

      console.log('🗺️ [notifyCustom] Building student maps...');
      dtos.forEach((dto) => {
        const studentId = this.extractStudentIdFromRangeKey(
          dto.dailyStudentKey,
        );
        const message = dto.schoolNote || '조퇴합니다.';
        schoolNoteMap.set(studentId, message);
        statusMap.set(
          studentId,
          this.translateStatusInOtherContext(dto.status),
        );
      });

      const studentIds = Array.from(schoolNoteMap.keys());
      console.log('🎯 [notifyCustom] Target student IDs:', studentIds);

      const allStudentIds = allStudents.map((s) => s.id);
      const intersection = studentIds.filter((id) =>
        allStudentIds.includes(id),
      );

      if (intersection.length === 0) {
        console.log('❌ [notifyCustom] No matching students found in group');
        throw new NotFoundException(
          '해당 그룹에서 대상 학생을 찾을 수 없습니다.',
        );
      }

      const messages = allStudents
        .filter((v) => studentIds.includes(v.id))
        .map((v: Student) => {
          const schoolNote = schoolNoteMap.get(v.id);
          const status = statusMap.get(v.id);
          const message = {
            id: v.parent.id,
            phone: v.parent.phone,
            token: v.parent.user?.pushToken ?? null,
            title: `${group.lesson.schoolName}`,
            body: `${v.name} 학생 ${status} : ${schoolNote}`,
            role: 'PARENT',
          };
          console.log(
            `💬 [notifyCustom] Created message for student ${v.id} (${v.name}):`,
            message,
          );
          return message;
        });

      console.log('📧 [notifyCustom] Total messages to send:', messages.length);

      // Dynamo 상태 업데이트
      console.log('🔄 [notifyCustom] Preparing DynamoDB update...');
      const updatedDtos = dtos.map((dto) => ({
        ...dto,
        schoolNote: dto.schoolNote || '조퇴합니다.',
        schoolNotedAt: new Date(),
      }));

      console.log(
        '💾 [notifyCustom] Executing DynamoDB bulk update...',
        JSON.stringify(updatedDtos, null, 2),
      );
      await this.updateAttendanceStatusInBulk(updatedDtos);
      await this.notificationService.send({
        messages,
        type: NotificationType.CLASS,
        schoolId: group.lesson.schoolId,
        role: 'PARENT',
      });

      console.log(
        '🎉 [notifyCustom] Process completed successfully, returning message count:',
        messages.length,
      );
      return messages.length;
    } catch (error) {
      console.error('❌ [notifyCustom] Error occurred:', error);
      console.error('🔥 [notifyCustom] Error stack:', error.stack);
      throw error;
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Create 또는 Update
  //? ---------------------------------------------------------------------- ?//

  async upsert(
    date: string, //! e.g. "2025-06-08" <- 하이픈 반드시 포함
    dto: CreateAttendanceWithGroupStudentDto,
  ): Promise<IAttendance> {
    console.log('🔍 [DEBUG] upsert dto:', JSON.stringify(dto, null, 2));
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
    const expires = Math.floor(addDays(new Date(), 400).getTime() / 1000);
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
      ...(typeof dto.parentNote === 'string' && {
        parentNotedAt: new Date(),
      }),
      //! 조퇴에서만 parentNotedAt 이 조퇴알림시각으로 사용되어서 빼버림.
      //! ...(typeof dto.schoolNote === 'string' && {
      //!   schoolNotedAt: new Date(),
      //! }),
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
      return result; // No conversion needed anymore!
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
          return result; // No conversion needed anymore!
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
    date: string, // `2025-07-22`
  ): Promise<IAttendance[]> {
    try {
      // todo. to put response on the cache
      const schooldays = await this.schooldayRepository.find({
        where: {
          groupId: getGroupIdFromGroupKey(groupKey),
          today: date,
        },
      });
      if (!schooldays || schooldays.length === 0) {
        return [];
      }

      const prefix = `DATE#${date}`;
      const result = await this.model
        .query('groupKey')
        .eq(groupKey)
        .where('dailyStudentKey')
        .beginsWith(prefix)
        .exec();
      const items = result as IAttendance[];
      console.log(`💚 items: ${items.length}`);

      const itemMap = new Map<string, IAttendance>(
        items.map((v) => [v.dailyStudentKey, v]),
      );

      const picks = await this.pickRepository.find({
        where: [
          {
            groupId: getGroupIdFromGroupKey(groupKey),
            endedBy: IsNull(), //! 전학가지 않은 경우
          },
          {
            groupId: getGroupIdFromGroupKey(groupKey),
            endedBy: Not(IsNull()), //! 전학간 경우
            end: MoreThanOrEqual(date),
          },
        ],
        relations: ['student', 'group', 'group.lesson'],
      });

      return picks.map((v) => {
        const dailyStudentKey = generateDailyStudentKey(
          date,
          v.studentId,
          v.student.grade,
          v.student.class,
          v.student.studentCode,
        );
        return (
          itemMap.get(dailyStudentKey) ||
          ({
            //expires: Math.floor(addDays(new Date(), 400).getTime() / 1000),
            groupId: v.group.id,
            start: v.group.start,
            end: v.group.end,
            groupKey: groupKey,
            lessonName: v.group.lesson.lessonName,
            duration: getDuration(v.group.start, v.group.end),
            studentId: v.student.id,
            studentName: v.student.name,
            dailyStudentKey: dailyStudentKey,
            status: AttendanceStatus.INIT,
          } as IAttendance)
        );
      });
    } catch (error) {
      // No conversion needed! Dynamoose handles it automatically
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
   * - next: 다음 수업명 또는 student.nextStop
   * - departure: 해당 학생의 당일 하교 정보 (있는 경우)
   *
   * @param groupKey DynamoDB 그룹 키 (e.g., "GROUP#48")
   * @param date 조회할 날짜 (e.g., "2025-06-08")
   *
   * @returns IAttendanceWithNextInfo[]
   * - 기본 출석 정보 + student entity + next 필드 + departure 정보
   * - student: { id, name, grade, class, studentCode, parent }
   * - next: string (다음 수업명 또는 student.nextStop)
   * - departure: Departure entity (해당 학생의 당일 하교 정보, 없으면 null)
   *
   * @performance
   * - MySQL 쿼리 최적화: IN 조건으로 모든 학생 및 departure 정보를 한 번에 조회
   * - 메모리 최적화: Map을 사용한 O(1) lookup
   * - N+1 쿼리 방지
   * - 복합 인덱스 활용: departure 테이블의 (date, studentId) 인덱스 사용
   */
  async findAttendancesByDateWithExtendedData(
    groupKey: string,
    date: string,
  ): Promise<IAttendanceWithNextInfo[]> {
    try {
      // 1. 해당 날짜에 수업이 있는지 확인
      const groupId = getGroupIdFromGroupKey(groupKey);
      const schooldays = await this.schooldayRepository.find({
        where: {
          groupId: groupId,
          today: date,
        },
      });
      if (!schooldays || schooldays.length === 0) {
        return [];
      }

      // 2. DynamoDB에서 기존 출석 데이터 조회
      const prefix = `DATE#${date}`;
      const items: IAttendance[] = await this.model
        .query('groupKey')
        .eq(groupKey)
        .where('dailyStudentKey')
        .beginsWith(prefix)
        .exec();

      // 3. 기존 레코드를 dailyStudentKey로 맵핑
      const itemMap = new Map<string, IAttendance>(
        items.map((v) => [v.dailyStudentKey, v]),
      );

      // 4. 모든 등록된 학생들(picks) 조회
      const picks = await this.pickRepository.find({
        where: {
          groupId: groupId,
          endedBy: IsNull(),
        },
        relations: ['student', 'group', 'group.lesson'],
      });

      if (picks.length === 0) {
        return [];
      }

      // 5. 완전한 출석 목록 생성 (기존 레코드 + 기본 레코드)
      const completeAttendanceItems: IAttendance[] = picks.map((pick) => {
        if (!pick.student) {
          throw new BadRequestException(
            `no student associated with group ${pick.group.id}`,
          );
        }
        const dailyStudentKey = generateDailyStudentKey(
          date,
          pick.studentId,
          pick.student.grade,
          pick.student.class,
          pick.student.studentCode,
        );

        return (
          itemMap.get(dailyStudentKey) ||
          ({
            groupId: pick.group.id,
            start: pick.group.start,
            end: pick.group.end,
            groupKey: groupKey,
            lessonId: pick.group.lessonId,
            lessonName: pick.group.lesson.lessonName,
            groupName: pick.group.groupName,
            duration: getDuration(pick.group.start, pick.group.end),
            studentId: pick.student.id,
            studentName: pick.student.name,
            dailyStudentKey: dailyStudentKey,
            status: AttendanceStatus.INIT,
          } as IAttendance)
        );
      });

      // 6. 학생 ID 추출
      const studentIds = completeAttendanceItems.map((item) => item.studentId!);

      // 7. 한 번의 쿼리로 모든 학생 정보 조회 (부모 정보 포함)
      const students = await this.studentRepository.find({
        where: { id: In(studentIds) },
        relations: ['parent'],
        select: [
          'id',
          'name',
          'grade',
          'class',
          'studentCode',
          'nextStop',
          'parent',
        ],
      });

      // 학생 ID를 key로 하는 Map 생성 (빠른 lookup을 위해)
      // 각 student entity는 response에서 student 필드로 반환됨
      const studentMap = new Map(
        students.map((student) => [student.id, student]),
      );

      // 4. 한 번의 최적화된 쿼리로 해당 날짜의 모든 학생 departure 정보 조회
      const departures = await this.departureRepository.find({
        where: {
          date: date,
          studentId: In(studentIds),
        },
        select: [
          'id',
          'date',
          'note',
          'createdAt',
          'updatedAt',
          'studentId', // Map 생성을 위해 필요
        ],
      });

      // 학생 ID를 key로 하는 departure Map 생성 (빠른 lookup을 위해)
      const departureMap = new Map<number, Departure>(
        departures.map((departure) => [departure.studentId, departure]),
      );

      // 5. 한 번의 최적화된 쿼리로 각 학생의 해당 날짜 모든 그룹 스케줄 조회
      const studentScheduleData: {
        studentId: number;
        groupId: number;
        groupName: string;
        endsAt: string;
      }[] = await this.pickRepository
        .createQueryBuilder('pick')
        .innerJoin('pick.group', 'group')
        .innerJoin('group.schooldays', 'schoolday')
        .select([
          'pick.studentId as studentId',
          'group.id as groupId',
          'group.groupName as groupName',
          'schoolday.endsAt as endsAt',
        ])
        .where('pick.studentId IN (:...studentIds)', { studentIds })
        .andWhere('DATE(schoolday.startsAt) = :targetDate', {
          targetDate: date,
        })
        .orderBy('pick.studentId')
        .addOrderBy('schoolday.endsAt', 'ASC')
        .getRawMany();

      // 6. 메모리에서 학생별 다음 수업 정보 계산
      const studentNextMap = new Map<number, string>();
      const studentIsLastMap = new Map<number, boolean>();

      // 학생별로 그룹핑하여 각 학생의 다음 수업 찾기
      const studentGroups = studentScheduleData.reduce(
        (acc, row) => {
          const studentId = row.studentId;
          if (!acc[studentId]) acc[studentId] = [];
          acc[studentId].push({
            groupId: row.groupId,
            groupName: row.groupName,
            endsAt: row.endsAt,
          });
          return acc;
        },
        {} as Record<
          number,
          { groupId: number; groupName: string; endsAt: string }[]
        >,
      );

      // 각 학생의 현재 그룹 다음 수업 찾기
      studentIds.forEach((studentId) => {
        const schedule = studentGroups[studentId] || [];
        const currentIndex = schedule.findIndex(
          (group) => group.groupId === groupId,
        );

        console.log(
          `🔍 [DEBUG] Student ${studentId}: schedule=${JSON.stringify(schedule)}, currentIndex=${currentIndex}, groupId=${groupId}`,
        );

        if (currentIndex === -1) {
          // 현재 그룹을 찾을 수 없는 경우
          const student = studentMap.get(studentId);
          const nextStop = student?.nextStop;
          const finalNext = nextStop || '하교장소 미지정';
          console.log(
            `❌ [DEBUG] Student ${studentId}: Group not found, student=${JSON.stringify(student)}, nextStop="${nextStop}", finalNext="${finalNext}"`,
          );
          studentNextMap.set(studentId, finalNext);
          studentIsLastMap.set(studentId, true); // 그룹을 찾을 수 없는 경우는 마지막으로 간주
        } else if (currentIndex === schedule.length - 1) {
          // 마지막 그룹인 경우
          const student = studentMap.get(studentId);
          const nextStop = student?.nextStop;
          const finalNext = nextStop || '하교장소 미지정';
          console.log(
            `🏁 [DEBUG] Student ${studentId}: Last group, student=${JSON.stringify(student)}, nextStop="${nextStop}", finalNext="${finalNext}"`,
          );
          studentNextMap.set(studentId, finalNext);
          studentIsLastMap.set(studentId, true); // 마지막 그룹
        } else {
          // 다음 그룹이 있는 경우
          const nextGroup = schedule[currentIndex + 1];
          const finalNext = nextGroup.groupName || '수업명 미지정';
          console.log(
            `➡️ [DEBUG] Student ${studentId}: Next group, nextGroup=${JSON.stringify(nextGroup)}, finalNext="${finalNext}"`,
          );
          studentNextMap.set(studentId, finalNext);
          studentIsLastMap.set(studentId, false); // 마지막 그룹이 아님
        }
      });

      // 11. 출석 데이터와 확장 정보 결합 (No conversion needed!)
      const attendancesWithNextInfo: IAttendanceWithNextInfo[] =
        completeAttendanceItems.map((item) => {
          return {
            ...item, // Already converted by Dynamoose!
            student: studentMap.get(item.studentId!),
            isLast: studentIsLastMap.get(item.studentId!) ?? false,
            next: studentNextMap.get(item.studentId!) ?? '이동장소 미지정',
            departure: departureMap.get(item.studentId!) ?? null,
          };
        });

      return attendancesWithNextInfo;
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
    dtos: CreateAttendanceWithKeyDto[],
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
            ...(dto.schoolNote !== undefined && {
              schoolNotedAt: new Date(), // Direct Date object!
            }),
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
    dtos: CreateAttendanceWithKeyDto[],
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

      // 2. 상태가 실제로 변경되거나 schoolNote가 있는 것만 필터링
      const recordsToUpdate = currentRecords.filter(
        ({ dto, currentRecord }) =>
          !currentRecord ||
          currentRecord.status !== dto.status ||
          (dto.schoolNote !== undefined &&
            currentRecord.schoolNote !== dto.schoolNote),
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
            ...(dto.schoolNote !== undefined && {
              schoolNotedAt: new Date(), // Direct Date object!
            }),
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
        results: [] as IAttendance[],
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
   * dailyStudentKey format: "DATE#2025-06-16#STUDENT#51#2-3-51" => 2025-06-16
   */
  private extractDateFromRangeKey(dailyStudentKey: string): string {
    const parts = dailyStudentKey.split('#');
    return parts[1];
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
