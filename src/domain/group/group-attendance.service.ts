import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays } from 'date-fns';
import { InjectModel, Model } from 'nestjs-dynamoose';
import { AttendanceStatus } from 'src/common/enums';
import { NotificationType } from 'src/common/enums/notification-type';
import { IDailyEscort } from 'src/common/interfaces';
import {
  CreateAttendanceWithGroupStudentDto,
  CreateAttendanceWithKeyDto,
} from 'src/domain/attendance/dto/upsert-attendance.dto';
import {
  IAttendance,
  IAttendanceKey,
  IAttendanceWithNextStop,
} from 'src/domain/attendance/entities/attendance.interface';
import { AttendanceReport } from 'src/domain/attendance/types/attendance.types';
import {
  filterNoSql,
  generateDailyStudentKey,
  generateGroupKey,
  getDateFromDailyStudentKey,
  getGroupIdFromGroupKey,
  getStudentIdFromDailyStudentKey,
  processAttendanceReport,
} from 'src/domain/attendance/utils/attendance.utils';
import { Departure } from 'src/domain/departure/entities/departure.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { getWeekNumberFromKoreanWeekday } from 'src/helpers/date';
import { NotificationService } from 'src/services/notification/notification.service';
import { Between, In, Repository } from 'typeorm';

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
  //? 수업시작 알림 (미발송 case 들은 아래 문서 참고.)
  //? https://www.notion.so/v3-DynamoDB-1fb4351cd47a80519649db17d05763d2
  //? 다이나모 attendance 갱신, schoolday 갱신, 알림발송
  //? ---------------------------------------------------------------------- ?//

  async notifyStart(
    groupId: number,
    dtos: CreateAttendanceWithKeyDto[],
  ): Promise<number> {
    if (dtos.length === 0) {
      throw new BadRequestException('dtos is empty');
    }

    const date = getDateFromDailyStudentKey(dtos[0].dailyStudentKey);
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

    // startedBy가 null이 아니라면, start가 date보다 같거나 이전인지 확인
    // endedBy가 null이 아니라면, end가 date보다 같거나 이후인지 확인
    const allStudents = group.picks
      .filter((v) => {
        if (v.startedBy !== null && v.start > date) {
          return false;
        }
        if (v.endedBy !== null && v.end < date) {
          return false;
        }
        return true;
      })
      .map((v) => v.student);
    if (allStudents.length !== dtos.length) {
      throw new BadRequestException(
        'the number of dtos must match with total number of students',
      );
    }

    const studentMessageMap = new Map<number, string>();
    dtos.forEach((dto) => {
      studentMessageMap.set(
        getStudentIdFromDailyStudentKey(dto.dailyStudentKey),
        this.translateStatusStartContext(dto.status),
      );
    });
    const studentIds = Array.from(studentMessageMap.keys());
    const messages = allStudents
      .filter((v) => studentIds.includes(v.id))
      .map((v: Student) => {
        return {
          id: v.parent.id,
          phone: v.parent.phone,
          token: v.parent.user?.pushToken ?? null,
          title: `${group.lesson.schoolName}`,
          body: `${group.lesson.lessonName} 수업시작 ${v.name} 학생: ${studentMessageMap.get(v.id)}`,
          role: 'PARENT',
        };
      });
    // Dynamo 상태 업데이트 (무조건 모두 변경한다.)
    await this.updateAttendanceStatusInBulk(dtos);
    // 수업시작알림 카운트 및 발송시각 업데이트
    await this.updateSchooldayCountsAndStartNotifiedAt(dtos, groupId, date);
    //! 수업시작알림 SMS/Notification 발송
    await this.notificationService.send({
      messages: messages.filter(
        (v) =>
          v.body.endsWith('선통보 조퇴') ||
          (!v.body.endsWith('결석') && !v.body.endsWith('지각')),
      ),
      type: NotificationType.CLASS,
      schoolId: group.lesson.schoolId,
      // schoolName: group.lesson.schoolName,
      role: 'PARENT',
    });

    return messages.length;
  }

  //? ---------------------------------------------------------------------- ?//
  //? 수업종료 알림 (미발송 case 들은 아래 문서 참고.)
  //? https://www.notion.so/v3-DynamoDB-1fb4351cd47a80519649db17d05763d2
  //? 다이나모 attendance 갱신, schoolday 갱신, 알림발송
  //? ---------------------------------------------------------------------- ?//

  async notifyEnd(
    groupId: number,
    dtos: CreateAttendanceWithKeyDto[],
  ): Promise<number> {
    if (dtos.length === 0) {
      throw new BadRequestException('dtos is empty');
    }
    const date = getDateFromDailyStudentKey(dtos[0].dailyStudentKey);
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

    // startedBy가 null이 아니라면, start가 date보다 같거나 이전인지 확인
    // endedBy가 null이 아니라면, end가 date보다 같거나 이후인지 확인
    const allStudents = group.picks
      .filter((v) => {
        if (v.startedBy !== null && v.start > date) {
          return false;
        }
        if (v.endedBy !== null && v.end < date) {
          return false;
        }
        return true;
      })
      .map((v) => v.student);
    if (allStudents.length !== dtos.length) {
      throw new BadRequestException(
        'the number of dtos must match with total number of students',
      );
    }

    const studentMessageMap = new Map<number, string>();
    dtos.forEach((dto) => {
      studentMessageMap.set(
        getStudentIdFromDailyStudentKey(dto.dailyStudentKey),
        this.translateStatusEndContext(dto.status),
      );
    });
    const studentIds = Array.from(studentMessageMap.keys());
    const messages = allStudents
      .filter((v) => studentIds.includes(v.id))
      .map((v: Student) => {
        return {
          id: v.parent.id,
          phone: v.parent.phone,
          token: v.parent.user?.pushToken ?? null,
          title: `${group.lesson.schoolName}`,
          body: `${group.lesson.lessonName} 수업종료 ${v.name} 학생: ${studentMessageMap.get(v.id)}`,
          role: 'PARENT',
        };
      });
    // Dynamo 상태 업데이트 (변경이 필요한 것만 변경한다.)
    await this.updateAttendanceStatusInBulkOptimized(dtos);
    // 수업종료알림 카운트 및 발송시각 업데이트
    await this.updateSchooldayCountsAndEndNotifiedAt(dtos, groupId, date);
    //! 수업종료알림 SMS/Notification 발송
    await this.notificationService.send({
      messages: messages.filter(
        (v) => !v.body.endsWith('조퇴') && !v.body.endsWith('선통보 결석'),
      ),
      type: NotificationType.CLASS,
      schoolId: group.lesson.schoolId,
      // schoolName: group.lesson.schoolName,
      role: 'PARENT',
    });

    return messages.length;
  }

  //? ---------------------------------------------------------------------- ?//
  //? 커스텀 알림
  //? 다이나모 attendance 갱신, 알림발송
  //? ---------------------------------------------------------------------- ?//

  async notifyCustom(
    groupId: number,
    dtos: CreateAttendanceWithKeyDto[],
  ): Promise<number> {
    if (dtos.length === 0) {
      throw new BadRequestException('dtos is empty');
    }

    const date = getDateFromDailyStudentKey(dtos[0].dailyStudentKey);

    // 모든 dto의 groupId가 파라미터로 받은 groupId와 일치하는지 validation
    const groupIds = dtos.map((v) => getGroupIdFromGroupKey(v.groupKey));
    const invalidGroupIds = groupIds.filter((id) => id !== groupId);
    if (invalidGroupIds.length > 0) {
      throw new BadRequestException(
        `found invalid groupIds: ${invalidGroupIds.join(', ')}`,
      );
    }

    // used to have dto date validation. probably too edge cases.
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

    // startedBy가 null이 아니라면, start가 date보다 같거나 이전인지 확인
    // endedBy가 null이 아니라면, end가 date보다 같거나 이후인지 확인
    const allStudents = group.picks
      .filter((v) => {
        if (v.startedBy !== null && v.start > date) {
          return false;
        }
        if (v.endedBy !== null && v.end < date) {
          return false;
        }
        return true;
      })
      .map((v) => v.student);

    const studentMessageMap = new Map<number, string>();
    const schoolNoteMap = new Map<number, string>();
    dtos.forEach((dto) => {
      const studentId = getStudentIdFromDailyStudentKey(dto.dailyStudentKey);
      const translatedStatus = this.translateStatusEndContext(dto.status);
      const schoolNote = dto.schoolNote || '-';
      studentMessageMap.set(studentId, translatedStatus);
      schoolNoteMap.set(studentId, schoolNote);
    });
    const studentIds = Array.from(studentMessageMap.keys());

    // validate if studentIds are in allStudents
    const invalidStudentIds = studentIds.filter(
      (id) => !allStudents.some((v) => v.id === id),
    );
    if (invalidStudentIds.length > 0) {
      throw new BadRequestException(
        `found invalid studentIds: ${invalidStudentIds.join(', ')}`,
      );
    }
    try {
      const updatedDtos: CreateAttendanceWithKeyDto[] = dtos.map((dto) => ({
        ...dto,
        schoolNote: dto.schoolNote,
        schoolNotedAt: new Date(),
      }));

      const messages = allStudents
        .filter((s: Student) => studentIds.includes(s.id))
        .map((v: Student) => {
          const status = studentMessageMap.get(v.id);
          const schoolNote = schoolNoteMap.get(v.id);
          return {
            id: v.parent.id,
            phone: v.parent.phone,
            token: v.parent.user?.pushToken ?? null,
            title: `${group.lesson.schoolName}`,
            body: `${group.lesson.lessonName} 수업알림 ${v.name} 학생: ${status}(${schoolNote})`,
            role: 'PARENT',
          };
        });

      console.log('💚 messages: ', JSON.stringify(messages, null, 2));
      // Dynamo 상태 업데이트
      await this.updateAttendanceStatusInBulk(updatedDtos);
      //! 커스텀 알림 SMS/Notification 발송
      await this.notificationService.send({
        messages,
        type: NotificationType.CLASS,
        schoolId: group.lesson.schoolId,
        // schoolName: group.lesson.schoolName,
        role: 'PARENT',
      });

      return messages.length;
    } catch (error) {
      console.error('❌ [notifyCustom] Error occurred:', error);
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
    const group = await this.groupRepository.findOneOrFail({
      where: { id: dto.groupId },
      relations: ['lesson', 'schooldays'],
    });
    const student = await this.studentRepository.findOneOrFail({
      where: { id: dto.studentId },
    });
    const schoolday = group.schooldays.find((v) => v.today === `${date}`);
    if (!schoolday) {
      throw new NotFoundException('해당일에 수업이 없습니다.');
    }

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

    // 기존 항목 조회
    let existing: IAttendance | null = null;
    try {
      existing = await this.model.get(itemKey);
    } catch (err) {
      console.warn(`[dynamoose] get 실패:`, err);
      existing = null;
    }

    const newData: Partial<IAttendance> = {
      ...existing,
      ...filterNoSql(dto), // status, parentNote, schoolNote
      lessonId: group.lessonId,
      lessonName: group.lesson.lessonName,
      groupId: group.id,
      groupName: group.groupName,
      studentId: student.id,
      studentName: student.name,
      start: group.start,
      end: group.end,
      weekday: group.weekday,
      expires,
      ...(typeof dto.parentNote === 'string' &&
        dto.parentNote !== existing?.parentNote && {
          parentNotedAt: new Date(),
        }),

      // ...(typeof dto.schoolNote === 'string' &&
      //   dto.schoolNote !== existing?.schoolNote && {
      //     schoolNotedAt: new Date(),
      //   }),
    };

    try {
      let result: IAttendance;

      if (existing) {
        const {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          groupKey,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          dailyStudentKey,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          updatedAt,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          createdAt,
          ...updateFields
        } = newData;
        result = await this.model.update(itemKey, updateFields);
      } else {
        // ✅ 없으면 create (완전 생성)
        result = await this.model.create({
          ...itemKey,
          ...newData,
        });
      }

      // forgot to update schoolday.dailyStudentKeys
      await this.updateSchooldayDailyStudentKeys(schoolday, dailyStudentKey);

      return result;
    } catch (err) {
      console.error(`[dynamoose v4] upsert error`, err);
      throw new BadRequestException(err.message);
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async findAttendancesByDate(
    groupKey: string,
    date: string, // `2025-07-22` 또는 `2025-08` (월 단위)
  ): Promise<IAttendance[]> {
    try {
      const groupId = getGroupIdFromGroupKey(groupKey);
      console.log(`🔍 Searching for groupId: ${groupId}, date: ${date}`);

      // 1. 해당 월의 모든 수업일(schooldays) 조회
      let schooldays: Schoolday[];

      if (date.includes('-') && date.split('-').length === 3) {
        // yyyy-MM-dd 형식인 경우 (특정 날짜)
        schooldays = await this.schooldayRepository.find({
          where: {
            groupId: groupId,
            today: date,
          },
        });
      } else {
        // yyyy-MM 형식인 경우 (월 단위) - DB 레벨에서 필터링
        const year = parseInt(date.split('-')[0]);
        const month = parseInt(date.split('-')[1]);

        // 해당 월의 시작일과 종료일 계산
        const startOfMonth = new Date(year, month - 1, 1); // 월은 0-based
        const endOfMonth = new Date(year, month, 0); // 다음 달의 0일 = 이번 달의 마지막 날

        schooldays = await this.schooldayRepository.find({
          where: {
            groupId: groupId,
            startsAt: Between(startOfMonth, endOfMonth),
          },
        });
      }

      if (schooldays.length === 0) {
        return [];
      }

      // 2. schooldays 에 연관된 모든 attendance 데이터 조회 (DynamoDB)
      const allAttendanceItems: IAttendance[] = [];

      for (const schoolday of schooldays) {
        const prefix = `DATE#${schoolday.today}`;
        const result = await this.model
          .query('groupKey')
          .eq(groupKey)
          .where('dailyStudentKey')
          .beginsWith(prefix)
          .exec();

        const items = result as IAttendance[];
        allAttendanceItems.push(...items);
      }

      console.log(
        `💚 Found ${allAttendanceItems.length} attendance items from DynamoDB`,
      );

      const itemMap = new Map<string, IAttendance>(
        allAttendanceItems.map((v) => [v.dailyStudentKey, v]),
      );

      // 3. 해당 그룹의 모든 학생 정보 조회
      const picks = await this.pickRepository.find({
        where: [
          {
            groupId: groupId,
          },
        ],
        relations: ['group', 'group.lesson', 'student'],
      });

      console.log(`📋 Found ${picks.length} picks`);

      // 4. 각 수업일별로 attendance 생성
      const attendances: IAttendance[] = [];

      for (const schoolday of schooldays) {
        console.log(`🔄 Processing schoolday: ${schoolday.today}`);

        for (const pick of picks) {
          const dailyStudentKey = generateDailyStudentKey(
            schoolday.today, // schoolday.today를 사용
            pick.studentId,
            pick.student.grade,
            pick.student.class,
            pick.student.studentCode,
          );

          const attendance =
            itemMap.get(dailyStudentKey) ||
            ({
              groupKey: groupKey,
              dailyStudentKey: dailyStudentKey,
              lessonId: pick.group.lessonId,
              lessonName: pick.group.lesson.lessonName,
              groupId: pick.group.id,
              groupName: pick.group.groupName,
              studentId: pick.student.id,
              studentName: pick.student.name,
              start: pick.group.start,
              end: pick.group.end,
              weekday: pick.group.weekday,
              status: AttendanceStatus.INIT,
            } as IAttendance);

          attendances.push(attendance);
        }
      }

      console.log(`🎯 Final result: ${attendances.length} attendances`);

      return attendances;
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
   * - isLast: 마지막 수업인지 여부
   * - next: 다음 수업명 또는 student.nextStop
   * - departure: 해당 학생의 당일 하교 정보 (있는 경우)
   *
   * @param groupKey DynamoDB 그룹 키 (e.g., "GROUP#48")
   * @param date 조회할 날짜 (e.g., "2025-06-08")
   *
   * @returns IAttendanceWithNextStop[]
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
  ): Promise<IAttendanceWithNextStop[]> {
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
      const weekNumber = getWeekNumberFromKoreanWeekday(schooldays[0].weekday);

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
      const picks =
        (await this.pickRepository.find({
          where: {
            groupId: groupId,
          },
          relations: ['student', 'group', 'group.lesson'],
        })) || [];

      const filteredPicks = picks.filter((v) => {
        if (v.startedBy !== null && v.start > date) {
          return false;
        }
        if (v.endedBy !== null && v.end < date) {
          return false;
        }
        return true;
      });

      if (filteredPicks.length < 1) {
        return [];
      }
      //const weekday = filteredPicks[0].group.weekday; // 오늘 수업으로부터 요일 추출

      // 5. 완전한 출석 목록 생성 (기존 레코드 + 기본 레코드)
      const completeAttendanceItems: IAttendance[] = filteredPicks.map(
        (pick) => {
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
              weekday: pick.group.weekday,
              studentId: pick.student.id,
              studentName: pick.student.name,
              dailyStudentKey: dailyStudentKey,
              status: AttendanceStatus.INIT,
            } as IAttendance)
          );
        },
      );

      // 6. 학생 ID 추출
      const studentIds = filteredPicks.map((v) => v.studentId);

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

      // 학생 ID를 key로 하는 student Map 생성 (빠른 lookup을 위해)
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

      // 5. 한 번의 최적화된 쿼리로 각 학생의 해당일 모든 그룹 스케줄 조회
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
        .andWhere('schoolday.today = :date', { date })
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
          const nextStop = this.getStudentEscort(
            weekNumber,
            student?.nextStops,
          );
          const finalNext = nextStop?.place || '미지정';
          console.log(
            `❌ [DEBUG] Student ${studentId}: Group not found, student=${JSON.stringify(student)}, nextStop="${nextStop?.name}", finalNext="${finalNext}"`,
          );
          studentNextMap.set(studentId, finalNext);
          studentIsLastMap.set(studentId, true); // 그룹을 찾을 수 없는 경우는 마지막으로 간주
        } else if (currentIndex === schedule.length - 1) {
          // 마지막 그룹인 경우
          const student = studentMap.get(studentId);
          const nextStop = this.getStudentEscort(
            weekNumber,
            student?.nextStops,
          );
          const finalNext = nextStop?.place || '미지정';
          console.log(
            `🏁 [DEBUG] Student ${studentId}: Last group, student=${JSON.stringify(student)}, nextStop="${nextStop?.name}", finalNext="${finalNext}"`,
          );
          studentNextMap.set(studentId, finalNext);
          studentIsLastMap.set(studentId, true); // 마지막 그룹
        } else {
          // 다음 그룹이 있는 경우
          const nextGroup = schedule[currentIndex + 1];
          const finalNext = nextGroup.groupName || '반이름 미지정';
          console.log(
            `➡️ [DEBUG] Student ${studentId}: Next group, nextGroup=${JSON.stringify(nextGroup)}, finalNext="${finalNext}"`,
          );
          studentNextMap.set(studentId, finalNext);
          studentIsLastMap.set(studentId, false); // 마지막 그룹이 아님
        }
      });

      // 11. 출석 데이터와 확장 정보 결합 (No conversion needed!)
      const attendancesWithNextInfo: IAttendanceWithNextStop[] =
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

  async getMonthlyReport(
    groupKey: string,
    date: string,
  ): Promise<AttendanceReport[]> {
    const items = await this.findAttendancesByDate(groupKey, date);
    return processAttendanceReport(items);
  }

  /**
   * 특정 학생의 월별 출석 데이터를 조회합니다.
   *
   * @param groupKey DynamoDB 그룹 키 (e.g., "GROUP#48")
   * @param month 조회할 월 (e.g., "2025-08")
   * @param studentId 학생 ID
   *
   * @returns 해당 월의 특정 학생 출석 데이터 배열
   */
  async getStudentMonthlyReport(
    groupKey: string,
    month: string,
    studentId: number,
  ): Promise<IAttendance[]> {
    try {
      // 월별 prefix 생성 (e.g., "DATE#2025-08")
      const monthPrefix = `DATE#${month}`;

      // 해당 월의 모든 출석 데이터 조회
      const result = await this.model
        .query('groupKey')
        .eq(groupKey)
        .where('dailyStudentKey')
        .beginsWith(monthPrefix)
        .exec();

      const items = result as IAttendance[];

      // 특정 학생의 데이터만 필터링
      const filteredItems = items.filter(
        (item) =>
          getStudentIdFromDailyStudentKey(item.dailyStudentKey) === studentId,
      );

      return filteredItems;
    } catch (error) {
      console.error(`[dynamodb] getStudentMonthlyReport error`, error);
      throw new BadRequestException('학생 월별 출석 정보 조회에 실패했습니다.');
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Private Utility Methods
  //? ---------------------------------------------------------------------- ?//

  /**
   * 기본 벌크 업데이트 - 모든 레코드를 무조건 업데이트
   *
   * 사용 시나리오:
   * - 대부분의 레코드가 변경될 것으로 예상되는 경우
   */
  private async updateAttendanceStatusInBulk(
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
            ...(dto.schoolNotedAt !== undefined && {
              schoolNotedAt: dto.schoolNotedAt,
            }),
          },
        ),
      );
      const results = await Promise.all(updatePromises);
      return results;
    } catch (error) {
      console.error(`[dynamodb] bulk update error`, error);
      throw new BadRequestException('출석 정보 일괄 업데이트에 실패했습니다.');
    }
  }

  /**
   * 벌크 업데이트 (WCU 최적화)
   *
   * 사용 시나리오:
   * - 대부분 변경이 없을 것으로 예상되는 경우
   */
  private async updateAttendanceStatusInBulkOptimized(
    dtos: CreateAttendanceWithKeyDto[],
  ): Promise<IAttendance[]> {
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

      // 2. 변경대상 (새로지정, 상태변경, schoolNote 변경) 추출
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
        return currentRecords.map((v) => v.currentRecord as IAttendance);
      }

      // 3. 추출한 변경대상만 update 실행
      const updatePromises = recordsToUpdate.map(({ dto }) =>
        this.model.update(
          {
            groupKey: dto.groupKey,
            dailyStudentKey: dto.dailyStudentKey,
          },
          {
            status: dto.status,
            ...(dto.schoolNote !== undefined && { schoolNote: dto.schoolNote }),
            ...(dto.schoolNotedAt !== undefined && {
              schoolNotedAt: dto.schoolNotedAt,
            }),
          },
        ),
      );

      const results = await Promise.all(updatePromises);
      // const skippedCount = dtos.length - recordsToUpdate.length;
      return results;
    } catch (error) {
      console.error(`[dynamodb] optimized bulk update error`, error);
      throw new BadRequestException(
        '출석 정보 최적화 일괄 업데이트에 실패했습니다.',
      );
    }
  }

  private getStudentEscort(
    weekNumber: number,
    stops?: IDailyEscort[],
  ): IDailyEscort {
    if (!stops) {
      return {
        place: '',
        name: '',
        phone: '',
      };
    }

    if (stops.length < 6) {
      return stops[0];
    }
    return stops[weekNumber - 1];
  }

  private translateStatusStartContext(status: AttendanceStatus): string {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return '출석';
      case AttendanceStatus.ABSENT:
        return '결석';
      case AttendanceStatus.LATE:
        return '지각';
      case AttendanceStatus.UNDETERMINED:
        return '미출석';
      case AttendanceStatus.LEFT:
        return '조퇴';
      case AttendanceStatus.EXCUSED_ABSENT:
        return '선통보 결석';
      case AttendanceStatus.EXCUSED_LATE:
        return '선통보 지각';
      case AttendanceStatus.EXCUSED_LEFT:
        return '출석';
      default:
        return '-';
    }
  }

  private translateStatusEndContext(status: AttendanceStatus): string {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return '출석';
      case AttendanceStatus.ABSENT:
        return '결석';
      case AttendanceStatus.LATE:
        return '지각';
      case AttendanceStatus.UNDETERMINED:
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
        return '-';
    }
  }

  /**
   * 학부모가 parentNote 를 남길때마다 그 학생의 키를 schoolday 에 추가
   */
  private async updateSchooldayDailyStudentKeys(
    schoolday: Schoolday,
    dailyStudentKey: string,
  ): Promise<void> {
    const updatedKeys = Array.from(
      new Set([...(schoolday.dailyStudentKeys ?? []), dailyStudentKey]),
    );

    await this.schooldayRepository
      .createQueryBuilder()
      .update(Schoolday)
      .set({
        dailyStudentKeys: updatedKeys,
      })
      .where('id = :id', { id: schoolday.id })
      .execute();
  }

  /**
   * schoolday 카운트 업데이트 및 시작알림 발송시각 업데이트
   */
  private async updateSchooldayCountsAndStartNotifiedAt(
    dtos: CreateAttendanceWithKeyDto[],
    groupId: number,
    date: string,
  ): Promise<void> {
    // 각 출석 상태별 카운트 계산
    const presentCount = dtos.filter(
      (dto) => dto.status === AttendanceStatus.PRESENT,
    ).length;
    const absentCount = dtos.filter(
      (dto) =>
        dto.status === AttendanceStatus.ABSENT ||
        dto.status === AttendanceStatus.EXCUSED_ABSENT,
    ).length;
    const lateCount = dtos.filter(
      (dto) =>
        dto.status === AttendanceStatus.LATE ||
        dto.status === AttendanceStatus.EXCUSED_LATE,
    ).length;
    const leftCount = dtos.filter(
      (dto) =>
        dto.status === AttendanceStatus.LEFT ||
        dto.status === AttendanceStatus.EXCUSED_LEFT,
    ).length;

    await this.schooldayRepository
      .createQueryBuilder()
      .update(Schoolday)
      .set({
        startNotifiedAt: new Date(),
        presentCount,
        absentCount,
        lateCount,
        leftCount,
      })
      .where('groupId = :groupId', { groupId })
      .andWhere('DATE(startsAt) = :date', { date })
      .execute();
  }

  /**
   * schoolday 카운트 업데이트 및 종료알림 발송시각 업데이트
   */
  private async updateSchooldayCountsAndEndNotifiedAt(
    dtos: CreateAttendanceWithKeyDto[],
    groupId: number,
    date: string,
  ): Promise<void> {
    // 각 출석 상태별 카운트 계산
    const presentCount = dtos.filter(
      (dto) => dto.status === AttendanceStatus.PRESENT,
    ).length;
    const absentCount = dtos.filter(
      (dto) =>
        dto.status === AttendanceStatus.ABSENT ||
        dto.status === AttendanceStatus.EXCUSED_ABSENT,
    ).length;
    const lateCount = dtos.filter(
      (dto) =>
        dto.status === AttendanceStatus.LATE ||
        dto.status === AttendanceStatus.EXCUSED_LATE,
    ).length;
    const leftCount = dtos.filter(
      (dto) =>
        dto.status === AttendanceStatus.LEFT ||
        dto.status === AttendanceStatus.EXCUSED_LEFT,
    ).length;

    await this.schooldayRepository
      .createQueryBuilder()
      .update(Schoolday)
      .set({
        endNotifiedAt: new Date(),
        presentCount,
        absentCount,
        lateCount,
        leftCount,
      })
      .where('groupId = :groupId', { groupId })
      .andWhere('DATE(startsAt) = :date', { date })
      .execute();
  }
}
