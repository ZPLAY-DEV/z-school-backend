import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays, getDay, lastDayOfMonth, parse } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import * as dynamoose from 'dynamoose';
import * as ExcelJS from 'exceljs';
import { InjectModel, Model } from 'nestjs-dynamoose';
import { AlarmType, AttendanceStatus } from 'src/common/enums';
import { INextStop } from 'src/common/interfaces';
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
  createFallbackAttendanceItem,
  filterNoSql,
  generateDailyStudentKey,
  generateGroupKey,
  getDateFromDailyStudentKey,
  getGroupIdFromGroupKey,
  getStudentIdFromDailyStudentKey,
  normalizeAttendance,
  normalizeAttendances,
  processAttendanceReport,
} from 'src/domain/attendance/utils/attendance.utils';
import { Departure } from 'src/domain/departure/entities/departure.entity';
import { PickedStudentDto } from 'src/domain/group/dto/picked-student.dto';
import { Group } from 'src/domain/group/entities/group.entity';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import {
  getTemplateOfClassEnd,
  getTemplateOfClassStart,
  getTemplateOfEarlyLeave,
} from 'src/helpers/get-message-body';
import { translateActor } from 'src/helpers/translate';
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

    // group 조회
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

    // dynamodb  출석부 upsert (무조건 모두 생성 또는 변경)
    await this.updateAttendanceStatusInBulk(dtos);

    // schooldays 그날의 학생 출석 카운트 및 발송시각 업데이트
    await this.updateSchooldayCountsAndStartNotifiedAt(dtos, groupId, date);

    // 현재 수강생 조회
    const activeStudents = group.picks
      .filter((v: Pick) => v.isActive)
      .map((v: Pick) => v.student);
    if (activeStudents.length !== dtos.length) {
      throw new BadRequestException(
        'the number of dtos must match with total number of students',
      );
    }

    // dto 로 전달된 수강생의 상태
    const studentStatusMap = new Map<number, AttendanceStatus>();
    dtos.forEach((dto) => {
      studentStatusMap.set(
        getStudentIdFromDailyStudentKey(dto.dailyStudentKey),
        dto.status,
      );
    });
    const studentIdsFromDtos = Array.from(studentStatusMap.keys());

    // 수업시작알림 메시지 준비
    // 제외 case: 선통보 결석
    const messages = activeStudents
      .filter((v) => studentIdsFromDtos.includes(v.id))
      .filter(
        (v) => studentStatusMap.get(v.id) !== AttendanceStatus.EXCUSED_ABSENT,
      )
      .map((v: Student) => {
        const body = getTemplateOfClassStart({
          school: group.lesson.schoolName ?? '학교명',
          lesson: group.lesson.lessonName,
          samName: group.samName ?? '담임쌤',
          location: group.location ?? '장소명',
          period: `${group.start} ~ ${group.end}`,
          name: v.name,
          status: this.translateStatus(
            studentStatusMap.get(v.id) || AttendanceStatus.NONE,
          ),
        });

        return {
          token: v.parent.user?.pushToken ?? null,
          phone: v.parent.phone,
          template: 'ClassStart1',
          title: '수업시작알림',
          body: body,
          role: 'PARENT',
        };
      });

    //? 수업시작알림 SMS/Notification 발송
    await this.notificationService.send({
      type: AlarmType.CLASS,
      schoolId: group.lesson.schoolId,
      messages: messages,
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

    // group 조회
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

    // dynamodb  출석부 upsert (optimized version))
    await this.updateAttendanceStatusInBulkOptimized(dtos);

    // schooldays 그날의 학생 출석 카운트 및 발송시각 업데이트
    await this.updateSchooldayCountsAndEndNotifiedAt(dtos, groupId, date);

    // 현재 수강생 조회
    const activeStudents = group.picks
      .filter((v: Pick) => v.isActive)
      .map((v: Pick) => v.student);
    if (activeStudents.length !== dtos.length) {
      throw new BadRequestException(
        'the number of dtos must match with total number of students',
      );
    }

    // dto 로 전달된 수강생의 상태
    const studentStatusMap = new Map<number, AttendanceStatus>();
    dtos.forEach((dto) => {
      studentStatusMap.set(
        getStudentIdFromDailyStudentKey(dto.dailyStudentKey),
        dto.status,
      );
    });
    const studentIdsFromDtos = Array.from(studentStatusMap.keys());

    // 수업종료알림 메시지 준비
    // 제외 case: 선통보 결석
    const messages = activeStudents
      .filter((v) => studentIdsFromDtos.includes(v.id))
      .filter(
        (v) => studentStatusMap.get(v.id) !== AttendanceStatus.EXCUSED_ABSENT,
      )
      .map((v: Student) => {
        const body = getTemplateOfClassEnd({
          school: group.lesson.schoolName ?? '학교명',
          lesson: group.lesson.lessonName,
          samName: group.samName ?? '담임쌤',
          location: group.location ?? '장소명',
          period: `${group.start} ~ ${group.end}`,
          name: v.name,
          status: this.translateStatus(
            studentStatusMap.get(v.id) || AttendanceStatus.NONE,
          ),
        });

        return {
          token: v.parent.user?.pushToken ?? null,
          phone: v.parent.phone,
          template: 'ClassEnd1',
          title: '수업종료알림',
          body: body,
          role: 'PARENT',
        };
      });

    //? 수업종료알림 SMS/Notification 발송
    await this.notificationService.send({
      type: AlarmType.CLASS,
      schoolId: group.lesson.schoolId,
      messages: messages,
    });

    return messages.length;
  }

  //? ---------------------------------------------------------------------- ?//
  //? 커스텀 알림 (조퇴에서 사용한다.)
  //? 다이나모 attendance 갱신, 알림발송
  //? ---------------------------------------------------------------------- ?//

  async notifyCustom(
    groupId: number,
    dto: CreateAttendanceWithKeyDto,
  ): Promise<number> {
    // groupIdFromDto 를 우선시 할 것
    const groupIdFromDto = getGroupIdFromGroupKey(dto.groupKey);
    const studentIdFromDto = getStudentIdFromDailyStudentKey(
      dto.dailyStudentKey,
    );

    // 학생 조회
    const student = await this.studentRepository.findOneOrFail({
      where: { id: studentIdFromDto },
      relations: ['parent', 'parent.user'],
    });

    // group 조회
    const group = await this.groupRepository.findOneOrFail({
      where: { id: groupIdFromDto },
      relations: [
        'lesson',
        'picks',
        'picks.student',
        'picks.student.parent',
        'picks.student.parent.user',
      ],
    });

    try {
      const updateDto: CreateAttendanceWithKeyDto = {
        ...dto,
        schoolNote: dto.schoolNote ?? '-',
        schoolNotedAt: new Date(),
      };

      const body = getTemplateOfEarlyLeave({
        name: student.name,
        school: group.lesson.schoolName ?? '학교명',
        timestamp: `${formatInTimeZone(new Date(), 'Asia/Seoul', 'M월d일 H시m분')}`,
        reason: dto.schoolNote ?? '미작성',
      });
      // Dynamo 상태 업데이트
      await this.updateAttendanceStatusInBulk([updateDto]);

      const messages = [
        {
          token: student.parent.user?.pushToken ?? null,
          phone: student.parent.phone,
          template: 'EarlyLeave1',
          title: '조퇴알림',
          body: body,
          role: 'PARENT',
        },
      ];

      //? 커스텀 알림 SMS/Notification 발송
      const result = await this.notificationService.send({
        type: AlarmType.CLASS,
        schoolId: group.lesson.schoolId,
        messages: messages,
      });

      return result.totalSent;
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
    // 1) 관계 데이터 로드
    const group = await this.groupRepository.findOneOrFail({
      where: { id: dto.groupId },
      relations: ['lesson', 'schooldays'],
    });
    if (!group) throw new NotFoundException('Group not found');
    if (!group.lesson) throw new NotFoundException('Lesson not found');
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

    // 새로운 로직: 특정일의 모든 수강생 출석 레코드를 생성하고 집계하여 MySQL 업데이트
    await this._ensureAllStudentsAttendanceRecords(date, group, schoolday);
    // upsert용 데이터 준비
    const upsertData: Partial<IAttendance> = {
      ...filterNoSql(dto), // status, parentNote, schoolNote
      lessonId: group.lesson.id,
      lessonName: group.lesson.lessonName,
      groupId: group.id,
      groupName: group.groupName,
      studentId: student.id,
      studentName: student.name,
      start: group.start,
      end: group.end,
      weekday: group.weekday,
      weekNumber: schoolday.weekNumber,
      expires,
    };

    const result = await this._updateTargetStudentAttendance(
      itemKey,
      upsertData,
    );

    // DynamoDB 레코드 집계하여 MySQL count 필드 업데이트 및 dailyStudentKeys 업데이트
    // dailyStudentKeys 는 EXCUSED_ABSENT 일때만 중복없이 추가.
    const updatedDailyStudentKeys =
      dto.status === AttendanceStatus.EXCUSED_ABSENT
        ? Array.from(
            new Set([...(schoolday.dailyStudentKeys ?? []), dailyStudentKey]),
          )
        : [...(schoolday.dailyStudentKeys ?? [])];
    await this._updateSchooldayFromDynamoDB(
      group.id,
      date,
      updatedDailyStudentKeys,
    );

    return result;
  }

  /**
   * 특정일의 모든 수강생 출석 레코드를 생성합니다.
   * DynamoDB에 없는 학생들의 기본 출석 레코드를 생성합니다.
   */
  private async _ensureAllStudentsAttendanceRecords(
    date: string,
    group: Group,
    schoolday: Schoolday,
  ): Promise<void> {
    // 1. 그룹의 모든 활성 수강생 목록 가져오기
    const picks = await this.pickRepository
      .createQueryBuilder('pick')
      .leftJoinAndSelect('pick.group', 'group')
      .leftJoinAndSelect('pick.student', 'student')
      .leftJoinAndSelect('student.parent', 'parent')
      .where('pick.groupId = :groupId', { groupId: group.id })
      .andWhere('pick.isActive = :isActive', { isActive: true })
      .getMany();

    const students = picks.map(
      (v: Pick) =>
        new PickedStudentDto({
          id: v.studentId,
          groupId: v.groupId,
          groupName: v.group.groupName,
          name: v.student.name,
          grade: v.student.grade,
          class: v.student.class,
          studentCode: v.student.studentCode,
          status: v.student.status,
          phone: v.student.phone,
          parentPhone: v.student.parent.phone,
          nextStops: v.student.nextStops,
          note: v.note,
          startedBy: v.startedBy,
          endedBy: v.endedBy,
          start: v.start || null,
          end: v.end || null,
          isActive: v.isActive,
        }),
    );

    if (students.length === 0) {
      return;
    }

    // 2. 현재 DynamoDB에 있는 출석 레코드들 가져오기
    const existingRecords = await this.fetchAllAttendanceItems(group.id, date);
    const existingStudentIds = new Set(
      existingRecords.map((record) => record.studentId).filter(Boolean),
    );

    // 3. 출석 레코드가 없는 학생들에 대해 기본 레코드 생성
    const recordsToCreate: IAttendance[] = [];
    const expires = Math.floor(addDays(new Date(), 400).getTime() / 1000);
    const groupKey = generateGroupKey(group.id);

    for (const student of students) {
      if (!existingStudentIds.has(student.id)) {
        const dailyStudentKey = generateDailyStudentKey(
          date,
          student.id,
          student.grade,
          student.class,
          student.studentCode,
        );

        recordsToCreate.push({
          groupKey,
          dailyStudentKey,
          lessonId: group.lesson.id,
          lessonName: group.lesson.lessonName,
          groupId: group.id,
          groupName: group.groupName,
          studentId: student.id,
          studentName: student.name,
          start: group.start,
          end: group.end,
          weekday: group.weekday,
          weekNumber: schoolday.weekNumber,
          status: AttendanceStatus.INIT, // 기본값: 수업 전
          expires,
        });
      }
    }

    // 4. 배치로 레코드 생성
    if (recordsToCreate.length > 0) {
      await Promise.all(
        recordsToCreate.map((record) => this.model.create(record)),
      );
    }
  }

  /**
   * 대상 학생의 출석 상태를 업데이트합니다.
   */
  private async _updateTargetStudentAttendance(
    itemKey: IAttendanceKey,
    upsertData: Partial<IAttendance>,
  ): Promise<IAttendance> {
    try {
      // 1차 시도: update (기존 아이템 업데이트)
      const result = await this.model.update(itemKey, upsertData);
      return normalizeAttendance(result);
    } catch (updateError: any) {
      // update 실패시 (아이템이 없거나 다른 이유) create 시도
      if (
        updateError.message?.includes('no item found') ||
        updateError.name === 'ValidationException'
      ) {
        const result = await this.model.create({
          ...itemKey,
          ...upsertData,
        } as IAttendance);
        return normalizeAttendance(result);
      } else {
        throw updateError;
      }
    }
  }

  /**
   * DynamoDB의 출석 레코드를 집계하여 MySQL schooldays 테이블의 count 필드를 업데이트합니다.
   */
  private async _updateSchooldayFromDynamoDB(
    groupId: number,
    date: string,
    dailyStudentKeys: string[],
  ): Promise<void> {
    // 1. DynamoDB에서 해당일의 모든 출석 레코드 가져오기
    const allRecords = await this.fetchAllAttendanceItems(groupId, date);

    // 2. 각 출석 상태별 카운트 계산
    const presentCount = allRecords.filter(
      (record) => record.status === AttendanceStatus.PRESENT,
    ).length;

    const absentCount = allRecords.filter(
      (record) =>
        record.status === AttendanceStatus.ABSENT ||
        record.status === AttendanceStatus.EXCUSED_ABSENT,
    ).length;

    const lateCount = allRecords.filter(
      (record) => record.status === AttendanceStatus.LATE,
    ).length;

    const leftCount = allRecords.filter(
      (record) => record.status === AttendanceStatus.LEFT,
    ).length;

    // 3. MySQL schooldays 테이블 업데이트
    await this.schooldayRepository
      .createQueryBuilder()
      .update(Schoolday)
      .set({
        presentCount,
        absentCount,
        lateCount,
        leftCount,
        dailyStudentKeys,
      })
      .where('groupId = :groupId', { groupId })
      .andWhere('today = :date', { date })
      .execute();
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  // 그날의 extended 출석부 정보
  async findExtendedAttendancesByDate(
    groupId: number,
    date: string, //! "2025-06-06"
  ): Promise<IAttendanceWithNextStop[]> {
    try {
      // 1. 해당 날짜에 수업이 있는지 확인
      const schooldays = await this.schooldayRepository.find({
        where: {
          groupId: groupId,
          today: date,
        },
      });
      if (!schooldays || schooldays.length === 0) {
        return [];
      }

      // 2. DynamoDB에서 출석 데이터 조회
      const allItems: IAttendance[] = await this.fetchAllAttendanceItems(
        groupId,
        date,
      );

      // 3. 출석 레코드를 dailyStudentKey로 맵핑
      const itemMap = new Map<string, IAttendance>(
        allItems.map((v) => [v.dailyStudentKey, v]),
      );

      // 4. 등록된 학생들(picks) 조회
      const picks =
        (await this.pickRepository.find({
          where: { groupId },
          relations: ['student', 'group', 'group.lesson'],
        })) || [];

      const activePicks = picks.filter((v: Pick) => v.isActive);

      if (activePicks.length < 1) {
        return [];
      }
      //const weekday = filteredPicks[0].group.weekday; // 오늘 수업으로부터 요일 추출

      // 5. 완전한 출석 목록 생성 (기존 레코드 + 기본 레코드)
      const completeAttendanceItems: IAttendance[] = activePicks.map((pick) => {
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

        const existingItem = itemMap.get(dailyStudentKey);
        if (existingItem) {
          // 기존 아이템이 있는 경우, normalize 함수로 정규화
          return {
            ...normalizeAttendance(existingItem),
            student: pick.student,
          };
        } else {
          // 새로운 아이템 생성 시 모든 필드를 null로 초기화
          return normalizeAttendance({
            groupId: pick.group.id,
            start: pick.group.start,
            end: pick.group.end,
            groupKey: generateGroupKey(pick.group.id),
            lessonId: pick.group.lessonId,
            lessonName: pick.group.lesson.lessonName,
            groupName: pick.group.groupName,
            weekday: pick.group.weekday,
            studentId: pick.student.id,
            studentName: pick.student.name,
            dailyStudentKey: dailyStudentKey,
            student: pick.student,
            status: AttendanceStatus.NONE,
          } as IAttendanceWithNextStop);
        }
      });

      // 6. 학생 ID 추출
      const studentIds = activePicks.map((v: Pick) => v.studentId);

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
          'nextStops',
          'parent',
        ],
      });

      // 8. 학생 ID를 key로 하는 student Map 생성 (빠른 lookup을 위해)
      const studentMap = new Map(
        students.map((student) => [student.id, student]),
      );

      // 9. 한 번의 최적화된 쿼리로 해당 날짜의 모든 학생 departure 정보 조회
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

      // 10. 학생 ID를 key로 하는 departure Map 생성 (빠른 lookup을 위해)
      const departureMap = new Map<number, Departure>(
        departures.map((departure) => [departure.studentId, departure]),
      );

      // 11. 한 번의 최적화된 쿼리로 각 학생의 해당일 모든 그룹 스케줄 조회
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

      // 12. 메모리에서 학생별 다음 수업 정보 계산
      const studentNextMap = new Map<number, string>();
      const studentIsLastMap = new Map<number, boolean>();

      // 13. 학생별로 그룹핑하여 각 학생의 다음 수업 찾기
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

      // 14. 오늘 수업하는 반중에서, 각 학생의 현재반 이후 다음반 찾기
      studentIds.forEach((studentId) => {
        const todayGroups = studentGroups[studentId] || [];
        const currentIndex = todayGroups.findIndex(
          (v) => v.groupId === groupId,
        );

        if (currentIndex === -1 || currentIndex === todayGroups.length - 1) {
          // 마지막 그룹이거나 못찾겠다면
          const student = studentMap.get(studentId);
          const nextStop = this.getStudentEscort(date, student?.nextStops);
          const finalNext = nextStop?.place || '미지정';
          studentNextMap.set(studentId, finalNext);
          studentIsLastMap.set(studentId, true); // 마지막 그룹임
        } else {
          // 다음 그룹이 있는 경우
          const nextGroup = todayGroups[currentIndex + 1];
          const finalNext = nextGroup.groupName || '반이름 미지정';
          studentNextMap.set(studentId, finalNext);
          studentIsLastMap.set(studentId, false); // 마지막 그룹이 아님
        }
      });

      // 15. 출석 데이터와 확장 정보 결합 (No conversion needed!)
      const attendancesWithNextInfo: IAttendanceWithNextStop[] =
        completeAttendanceItems.map((item) => {
          return {
            ...item, // Already converted by Dynamoose!
            student: studentMap.get(item.studentId)!,
            isLast: studentIsLastMap.get(item.studentId) ?? false,
            next: studentNextMap.get(item.studentId) ?? '이동장소 미지정',
            departure: departureMap.get(item.studentId) ?? null,
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
    groupId: number,
    date: string, //? "2025-08"
  ): Promise<AttendanceReport[]> {
    const items = await this.findAttendancesByMonth(groupId, date);

    return processAttendanceReport(items);
  }

  async generateExcel(
    groupId: number,
    date: string, //? `2025-08`
  ): Promise<ExcelJS.Workbook> {
    let rowIndex;
    const year = Number(date.split('-')[0]);
    const month = Number(date.split('-')[1]);
    const firstDay = `${month}월 1일`;
    const lastDay = `${month}월 ${lastDayOfMonth(new Date(year, month - 1, 1)).getDate()}일`;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('월별출석보고서');

    // 1. 그룹 정보 조회 (schooldays, picks.student 관계 포함)
    const group = await this.groupRepository.findOneOrFail({
      where: { id: groupId },
      relations: ['schooldays', 'picks', 'picks.student', 'sam'],
    });

    // 2. 해당 월의 수업일 필터링
    const monthSchooldays = group.schooldays
      .filter((schoolday) => schoolday.today.startsWith(date))
      .sort((a, b) => a.today.localeCompare(b.today));

    // 3. 해당 월의 출석 데이터 조회
    const attendances = await this.findAttendancesByMonth(groupId, date);

    // 4. 출석 데이터를 Map으로 변환 (빠른 lookup을 위해)
    const attendanceMap = new Map<string, IAttendance>();
    attendances.forEach((attendance) => {
      const date = getDateFromDailyStudentKey(attendance.dailyStudentKey);
      const studentId = getStudentIdFromDailyStudentKey(
        attendance.dailyStudentKey,
      );
      const key = `${date}_${studentId}`;
      attendanceMap.set(key, attendance);
    });

    // 5. 타이틀 행 추가
    const titleRow = sheet.addRow([`${year}년 ${month}월 ${group.groupName}`]);
    titleRow.font = { bold: true, size: 16 };
    titleRow.alignment = { horizontal: 'center' };

    const lastCol = String.fromCharCode(65 + monthSchooldays.length + 2);
    sheet.mergeCells(`A1:${lastCol}1`);

    // breathing room
    const row2 = sheet.addRow(['']); // 빈 row 추가
    rowIndex = row2.number;
    sheet.mergeCells(`A${rowIndex}:${lastCol}${rowIndex}`);

    // 7. 수업기간 정보 행 추가 (titleRow 바로 아래로 이동)
    const periodRow = sheet.addRow([]);
    periodRow.height = 20;
    periodRow.font = { size: 10 };
    const periodCell = periodRow.getCell(1);
    periodCell.value = `📆 수업기간: ${firstDay} ~ ${lastDay}`;
    periodCell.alignment = { horizontal: 'left' };

    const mergeStart = monthSchooldays.length + 1;
    const mergeEnd = monthSchooldays.length + 2;
    sheet.mergeCells(
      `${String.fromCharCode(65 + mergeStart)}3:${String.fromCharCode(65 + mergeEnd)}3`,
    );

    const instructorCell = periodRow.getCell(mergeEnd); // 오른쪽 끝 셀에 값 지정
    instructorCell.value = `👤 강사: ${group.samName || '미지정'}`;
    instructorCell.alignment = { horizontal: 'right' };

    // breathing room
    const row4 = sheet.addRow(['']); // 빈 row 추가
    rowIndex = row4.number;
    sheet.mergeCells(`A${rowIndex}:${lastCol}${rowIndex}`);

    // 8. 서명 칸 추가 (오른쪽 정렬)
    const col1 = monthSchooldays.length + 1;
    const col2 = monthSchooldays.length + 2;
    const col3 = monthSchooldays.length + 3;

    const row5 = sheet.addRow([]);
    const signCell1 = row5.getCell(col1);
    signCell1.value = '강사';
    signCell1.alignment = { horizontal: 'center' };
    signCell1.font = { bold: true };

    const signCell2 = row5.getCell(col2);
    signCell2.value = '담당자';
    signCell2.alignment = { horizontal: 'center' };
    signCell2.font = { bold: true };

    const signCell3 = row5.getCell(col3);
    signCell3.value = '실장';
    signCell3.alignment = { horizontal: 'center' };
    signCell3.font = { bold: true };

    // 8. 서명 공간 (아래 2줄)
    const row6 = sheet.addRow([]);
    const row7 = sheet.addRow([]);

    // merge (강사/담당자/실장 각각 아래 2행 병합)
    sheet.mergeCells(
      `${String.fromCharCode(65 + col1 - 1)}${row6.number}:${String.fromCharCode(65 + col1 - 1)}${row7.number}`,
    );
    sheet.mergeCells(
      `${String.fromCharCode(65 + col2 - 1)}${row6.number}:${String.fromCharCode(65 + col2 - 1)}${row7.number}`,
    );
    sheet.mergeCells(
      `${String.fromCharCode(65 + col3 - 1)}${row6.number}:${String.fromCharCode(65 + col3 - 1)}${row7.number}`,
    );

    // border 처리
    [row5, row6, row7].forEach((r) => {
      [col1, col2, col3].forEach((c) => {
        const cell = r.getCell(c);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // breathing room
    const row8 = sheet.addRow(['']); // 빈 row 추가
    rowIndex = row8.number;
    sheet.mergeCells(`A${rowIndex}:${lastCol}${rowIndex}`);

    // 9. 헤더 행 추가
    const headerRow = ['순번', '학년·반·번호', '이름'];
    monthSchooldays.forEach((schoolday) => {
      const date = new Date(schoolday.today);
      const day = date.getDate().toString();
      headerRow.push(`${month}월 ${day}일 (${schoolday.weekday})`);
    });
    sheet.addRow(headerRow);

    // 주차 정보 행 추가
    const weekRow = ['', '', ''];
    monthSchooldays.forEach((schoolday) => {
      weekRow.push(`${schoolday.weekNumber}주차`);
    });
    sheet.addRow(weekRow);

    // 10. 헤더 스타일링
    const headerRowObj = sheet.getRow(sheet.rowCount - 1); // 헤더 행
    headerRowObj.font = { bold: true };
    headerRowObj.alignment = { horizontal: 'center' };
    headerRowObj.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // 주차 행 스타일링
    const weekRowObj = sheet.getRow(sheet.rowCount);
    weekRowObj.alignment = { horizontal: 'center' };
    weekRowObj.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    const comments: string[] = ['특이사항:'];

    // 11. 학생별 출석 데이터 추가
    group.picks.forEach((pick, index) => {
      const student = pick.student;
      const rowData = [
        index + 1, // 순번
        `${student.grade}학년 ${student.class}반 ${student.studentCode}번`, // 학년,반,번호
        student.name, // 이름
      ];
      if (
        pick.isActive &&
        pick.startedBy &&
        pick.start.toString().startsWith(date)
      ) {
        comments.push(
          `${pick.student.name} 학생 ${pick.start} 등록 (${translateActor(pick.startedBy)})`,
        );
      }
      if (
        !pick.isActive &&
        pick.endedBy &&
        pick.end.toString().startsWith(date)
      ) {
        comments.push(
          `${pick.student.name} 학생 ${pick.end} 취소 (${translateActor(pick.endedBy)})`,
        );
      }

      // 각 수업일별 출석 상태 추가
      monthSchooldays.forEach((schoolday) => {
        const key = `${schoolday.today}_${student.id}`;
        const attendance = attendanceMap.get(key);

        if (attendance) {
          // 출석 상태에 따른 표시
          let statusText = '';
          switch (attendance.status) {
            case AttendanceStatus.PRESENT:
              statusText = '출석';
              break;
            case AttendanceStatus.ABSENT:
            case AttendanceStatus.EXCUSED_ABSENT:
              statusText = '결석';
              break;
            case AttendanceStatus.LATE:
              statusText = '지각';
              break;
            case AttendanceStatus.LEFT:
              statusText = '조퇴';
              break;
            case AttendanceStatus.INIT:
              statusText = '수업전';
              break;
            default:
              statusText = '?';
              break;
          }
          rowData.push(statusText);
        } else {
          rowData.push(''); // 출석 데이터가 없는 경우 빈 칸
        }
      });

      const dataRow = sheet.addRow(rowData);

      // 데이터 행 스타일링
      dataRow.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };

        // 출석 상태에 따른 배경색 설정
        if (colNumber > 3) {
          // 헤더 3개 이후부터
          const statusText = cell.value as string;
          if (statusText === '출석') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF90EE90' }, // 연한 초록색
            };
          } else if (statusText === '결석') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFB6C1' }, // 연한 빨간색
            };
          } else if (statusText === '지각') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFD700' }, // 연한 노란색
            };
          } else if (statusText === '조퇴') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF87CEEB' }, // 연한 파란색
            };
          }
        }
      });
    });

    // 12. 열 너비 자동 조정
    sheet.columns.forEach((column) => {
      column.width = 15;
    });

    // breathing space row 추가
    const breathingRow = sheet.addRow(['']);
    const breathingRowIndex = breathingRow.number;

    // 전체 가로로 merge
    sheet.mergeCells(`A${breathingRowIndex}:${lastCol}${breathingRowIndex}`);

    // 13. 코멘트 추가
    comments.forEach((comment) => {
      sheet.addRow([comment]);
    });

    return workbook;
  }

  //? Optimized version using schoolday query + batchGet pattern
  //? This approach is much more efficient than fetching all attendance items
  async getStudentAttendances(
    groupId: number,
    studentId: number,
    monthStr: string, //? ex. "2025-08"
  ): Promise<IAttendance[]> {
    const year = Number(monthStr.split('-')[0]);
    const month = Number(monthStr.split('-')[1]);
    const startOfMonth = new Date(year, month - 1, 1); // 월은 0-base
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999); // 다음 달의 0일 = 이번 달의 마지막 날 (23:59:59.999까지 포함)

    try {
      // 1. 한 번의 쿼리로 schooldays와 picks, student를 조인해서 해당 학생의 수업일 조회
      const schooldays = await this.schooldayRepository
        .createQueryBuilder('schoolday')
        .leftJoinAndSelect('schoolday.group', 'group')
        .leftJoinAndSelect('group.picks', 'pick')
        .leftJoinAndSelect('pick.student', 'student')
        .where('schoolday.groupId = :groupId', { groupId })
        .andWhere('pick.studentId = :studentId', { studentId })
        .andWhere('schoolday.startsAt BETWEEN :beginning AND :ending', {
          beginning: startOfMonth,
          ending: endOfMonth,
        })
        .orderBy('schoolday.startsAt', 'ASC')
        .getMany();

      if (schooldays.length === 0) {
        throw new BadRequestException(`수업일이 없거나 수강생이 아닙니다.`);
      }

      // 2. schooldays를 기반으로 attendance 키 생성
      const groupKey = generateGroupKey(groupId);
      const keys = schooldays.map((schoolday) => {
        // schoolday.group.picks에서 해당 student 찾기
        if (!schoolday.group || !schoolday.group.picks) {
          throw new BadRequestException('Group or picks information not found');
        }
        const pick = schoolday.group.picks.find(
          (p) => p.studentId === studentId,
        );
        if (!pick || !pick.student) {
          throw new BadRequestException('Student information not found');
        }
        const dailyStudentKey = generateDailyStudentKey(
          schoolday.today,
          pick.student.id,
          pick.student.grade,
          pick.student.class,
          pick.student.studentCode,
        );
        return {
          groupKey,
          dailyStudentKey,
        };
      });

      // 3. DynamoDB에서 attendance 레코드들 조회 (batchGetByIdWithUserId와 동일)
      const results: IAttendance[] = [];
      if (keys.length > 0) {
        try {
          // DynamoDB BatchGetItem은 한 번에 최대 100개 아이템만 처리 가능
          const BATCH_SIZE = 100;
          const chunks: Array<
            Array<{ groupKey: string; dailyStudentKey: string }>
          > = [];

          for (let i = 0; i < keys.length; i += BATCH_SIZE) {
            chunks.push(keys.slice(i, i + BATCH_SIZE));
          }

          console.log(
            `[dynamodb] Processing ${keys.length} keys in ${chunks.length} chunks`,
          );

          for (const chunk of chunks) {
            const batchResults = await this.model.batchGet(chunk);
            for (const item of batchResults) {
              if (item) {
                results.push(item as IAttendance);
              }
            }
          }
        } catch (batchError) {
          console.error(`[dynamodb] batchGet error:`, batchError);
          // batchGet 실패 시 fallback으로 빈 배열 사용
        }
      }

      // 4. DynamoDB에 없는 레코드에 대해 fallback item 생성
      const attendanceMap = new Map<string, IAttendance>(
        results.map((attendance) => [attendance.dailyStudentKey, attendance]),
      );

      const finalResults: IAttendance[] = [];
      for (const schoolday of schooldays) {
        // schoolday.group.picks에서 해당 student 찾기
        if (!schoolday.group || !schoolday.group.picks) {
          throw new BadRequestException('Group or picks information not found');
        }
        const pick = schoolday.group.picks.find(
          (p) => p.studentId === studentId,
        );
        if (!pick || !pick.student) {
          throw new BadRequestException('Student information not found');
        }
        const dailyStudentKey = generateDailyStudentKey(
          schoolday.today,
          pick.student.id,
          pick.student.grade,
          pick.student.class,
          pick.student.studentCode,
        );
        const existingAttendance = attendanceMap.get(dailyStudentKey);

        if (existingAttendance) {
          // DynamoDB에 레코드가 있는 경우
          finalResults.push(existingAttendance);
        } else {
          // DynamoDB에 레코드가 없는 경우 fallback item 생성
          const fallbackItem = createFallbackAttendanceItem(
            schoolday,
            studentId,
            groupKey,
          );
          finalResults.push(fallbackItem);
        }
      }

      return normalizeAttendances(finalResults);
    } catch (error) {
      console.error(`[dynamodb] getStudentAttendances error:`, error);
      throw new BadRequestException(error.message);
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Private Utility Methods
  //? ---------------------------------------------------------------------- ?//

  private async findAttendancesByMonth(
    groupId: number,
    monthStr: string, //? `2025-08` (월 단위)
  ): Promise<IAttendance[]> {
    const year = Number(monthStr.split('-')[0]);
    const month = Number(monthStr.split('-')[1]);
    const startOfMonth = new Date(year, month - 1, 1); // 월은 0-based
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999); // 다음 달의 0일 = 이번 달의 마지막 날 (23:59:59.999까지 포함)

    try {
      // 1. 한 번의 쿼리로 schooldays와 picks, student를 조인해서 해당 반의 모든 수업일과 학생 정보 조회
      const schooldays = await this.schooldayRepository
        .createQueryBuilder('schoolday')
        .leftJoinAndSelect('schoolday.group', 'group')
        .leftJoinAndSelect('group.picks', 'pick')
        .leftJoinAndSelect('pick.student', 'student')
        .leftJoinAndSelect('group.lesson', 'lesson')
        .where('schoolday.groupId = :groupId', { groupId })
        .andWhere('schoolday.startsAt BETWEEN :beginning AND :ending', {
          beginning: startOfMonth,
          ending: endOfMonth,
        })
        .orderBy('schoolday.startsAt', 'ASC')
        .getMany();

      if (!schooldays || schooldays.length === 0) {
        console.log(
          `📅 No schooldays found for group ${groupId} in ${monthStr}`,
        );
        return [];
      }

      // 2. schooldays를 기반으로 attendance 키 생성
      const groupKey = generateGroupKey(groupId);
      const keys: Array<{ groupKey: string; dailyStudentKey: string }> = [];

      for (const schoolday of schooldays) {
        if (!schoolday.group || !schoolday.group.picks) {
          console.warn(
            `⚠️ Group or picks information not found for schoolday ${schoolday.today}`,
          );
          continue;
        }

        for (const pick of schoolday.group.picks) {
          if (!pick.student) {
            console.warn(
              `⚠️ Student information not found for pick ${pick.id}`,
            );
            continue;
          }

          const dailyStudentKey = generateDailyStudentKey(
            schoolday.today,
            pick.student.id,
            pick.student.grade,
            pick.student.class,
            pick.student.studentCode,
          );

          keys.push({
            groupKey,
            dailyStudentKey,
          });
        }
      }

      // 3. DynamoDB에서 attendance 레코드들 조회 (batchGet)
      const results: IAttendance[] = [];
      if (keys.length > 0) {
        try {
          // DynamoDB BatchGetItem은 한 번에 최대 100개 아이템만 처리 가능
          const BATCH_SIZE = 100;
          const chunks: Array<
            Array<{ groupKey: string; dailyStudentKey: string }>
          > = [];

          for (let i = 0; i < keys.length; i += BATCH_SIZE) {
            chunks.push(keys.slice(i, i + BATCH_SIZE));
          }

          console.log(
            `[dynamodb] Processing ${keys.length} keys in ${chunks.length} chunks`,
          );

          for (const chunk of chunks) {
            const batchResults = await this.model.batchGet(chunk);
            for (const item of batchResults) {
              if (item) {
                results.push(item as IAttendance);
              }
            }
          }
        } catch (batchError) {
          console.error(`[dynamodb] batchGet error:`, batchError);
          // batchGet 실패 시 fallback으로 빈 배열 사용
        }
      }

      // 4. DynamoDB에 없는 레코드에 대해 fallback item 생성
      const attendanceMap = new Map<string, IAttendance>(
        results.map((attendance) => [attendance.dailyStudentKey, attendance]),
      );

      const finalResults: IAttendance[] = [];

      for (const schoolday of schooldays) {
        if (!schoolday.group || !schoolday.group.picks) {
          continue;
        }

        for (const pick of schoolday.group.picks) {
          if (!pick.student || !schoolday.group.lesson) {
            continue;
          }

          const dailyStudentKey = generateDailyStudentKey(
            schoolday.today,
            pick.student.id,
            pick.student.grade,
            pick.student.class,
            pick.student.studentCode,
          );

          const existingAttendance = attendanceMap.get(dailyStudentKey);

          if (existingAttendance) {
            // DynamoDB에 레코드가 있는 경우
            finalResults.push(existingAttendance);
          } else {
            // DynamoDB에 레코드가 없는 경우 fallback item 생성
            const fallbackItem = createFallbackAttendanceItem(
              schoolday,
              pick.student.id,
              groupKey,
            );
            finalResults.push(fallbackItem);
          }
        }
      }

      console.log(
        `🎯 Final result: ${finalResults.length} attendances for group ${groupId} in ${monthStr}`,
      );

      return normalizeAttendances(finalResults);
    } catch (error) {
      console.error(`[dynamodb] findAttendancesByMonth error:`, error);
      throw new BadRequestException(
        error.message || '출석 정보 조회에 실패했습니다.',
      );
    }
  }

  /**
   * 기본 벌크 upsert - 모든 레코드를 무조건 upsert
   *
   * 사용 시나리오:
   * - 대부분의 레코드가 변경될 것으로 예상되는 경우
   * - 레코드가 존재하지 않을 수도 있는 경우
   */
  private async updateAttendanceStatusInBulk(
    dtos: CreateAttendanceWithKeyDto[],
  ): Promise<IAttendance[]> {
    try {
      const upsertPromises = dtos.map(async (dto) => {
        const itemKey = {
          groupKey: dto.groupKey,
          dailyStudentKey: dto.dailyStudentKey,
        };
        const upsertData = {
          status: dto.status,
          ...(dto.schoolNote !== undefined && { schoolNote: dto.schoolNote }),
          ...(dto.schoolNotedAt !== undefined && {
            schoolNotedAt: dto.schoolNotedAt,
          }),
        };

        try {
          // 1차 시도: update (레코드가 존재할 때만 업데이트, 없으면 에러)
          const updateResult = await this.model.update(itemKey, upsertData, {
            condition: new dynamoose.Condition().where('groupKey').exists(),
            return: 'item',
          });

          return updateResult;
        } catch (updateError: any) {
          // update 실패시 (아이템이 없거나 다른 이유) create 시도
          if (
            updateError.message?.includes('no item found') ||
            updateError.name === 'ValidationException' ||
            updateError.name === 'ConditionalCheckFailedException'
          ) {
            const studentId = getStudentIdFromDailyStudentKey(
              dto.dailyStudentKey,
            );

            const dateStr = getDateFromDailyStudentKey(dto.dailyStudentKey);

            // Group, Student, Schoolday 정보를 한 번의 쿼리로 조회 (최적화)
            const groupId = getGroupIdFromGroupKey(dto.groupKey);
            const result = await this.groupRepository
              .createQueryBuilder('group')
              .leftJoinAndSelect('group.lesson', 'lesson')
              .leftJoinAndSelect('group.schooldays', 'schoolday')
              .leftJoinAndSelect('group.picks', 'pick')
              .leftJoinAndSelect('pick.student', 'student')
              .where('group.id = :groupId', { groupId })
              .andWhere('schoolday.today = :dateStr', { dateStr })
              .andWhere('student.id = :studentId', { studentId })
              .getOne();

            if (!result) {
              throw new NotFoundException(
                'Group, Student, or Schoolday not found',
              );
            }

            const group = result;
            const student = result.picks?.find(
              (p) => p.student.id === studentId,
            )?.student;
            const schoolday = result.schooldays?.find(
              (s) => s.today === dateStr,
            );

            if (!student) {
              throw new NotFoundException('Student not found in group');
            }
            if (!schoolday) {
              throw new NotFoundException('Schoolday not found for the date');
            }

            const expires = Math.floor(
              addDays(new Date(), 400).getTime() / 1000,
            );

            const createData = {
              ...itemKey,
              lessonId: group.lessonId,
              lessonName: group.lesson.lessonName,
              groupId: group.id,
              groupName: group.groupName,
              studentId: student.id,
              studentName: student.name,
              start: group.start,
              end: group.end,
              weekday: group.weekday,
              weekNumber: schoolday.weekNumber,
              expires,
              ...upsertData,
            };

            return await this.model.create(createData);
          }
          throw updateError;
        }
      });

      const results = await Promise.all(upsertPromises);
      return normalizeAttendances(results);
    } catch (error) {
      console.error(`[dynamodb] bulk upsert error`, error);
      throw new BadRequestException('출석 정보 일괄 upsert에 실패했습니다.');
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
        return normalizeAttendances(
          currentRecords.map((v) => v.currentRecord as IAttendance),
        );
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
      return normalizeAttendances(results);
    } catch (error) {
      console.error(`[dynamodb] optimized bulk update error`, error);
      throw new BadRequestException(
        '출석 정보 최적화 일괄 업데이트에 실패했습니다.',
      );
    }
  }

  private getStudentEscort(date: string, stops?: INextStop[]): INextStop {
    const dateObj = parse(date, 'yyyy-MM-dd', new Date());
    const weekday = getDay(dateObj);
    if (!stops) {
      return {
        place: '',
        name: '',
        phone: '',
      };
    }

    return stops.length < 6 ? stops[0] : stops[weekday - 1];
  }

  private translateStatus(status: AttendanceStatus): string {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return '출석';
      case AttendanceStatus.ABSENT:
      case AttendanceStatus.EXCUSED_ABSENT:
        return '결석';
      case AttendanceStatus.LATE:
        return '지각';
      case AttendanceStatus.PENDING:
        return '미출석';
      case AttendanceStatus.LEFT:
        return '조퇴';
      default:
        return '-';
    }
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
      (dto) => dto.status === AttendanceStatus.LATE,
    ).length;
    const leftCount = dtos.filter(
      (dto) => dto.status === AttendanceStatus.LEFT,
    ).length;

    // UTC 기준으로 날짜 계산
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

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
      .andWhere('startsAt >= :startOfDay AND startsAt < :endOfDay', {
        startOfDay,
        endOfDay,
      })
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
      (dto) => dto.status === AttendanceStatus.LATE,
    ).length;
    const leftCount = dtos.filter(
      (dto) => dto.status === AttendanceStatus.LEFT,
    ).length;

    // UTC 기준으로 날짜 계산
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

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
      .andWhere('startsAt >= :startOfDay AND startsAt < :endOfDay', {
        startOfDay,
        endOfDay,
      })
      .execute();
  }

  private async fetchAllAttendanceItems(groupId: number, date: string) {
    let allItems: IAttendance[] = [];
    let lastKey: IAttendanceKey | undefined = undefined;

    do {
      const query = this.model
        .query('groupKey')
        .eq(generateGroupKey(groupId))
        .where('dailyStudentKey')
        .beginsWith(`DATE#${date}`);

      // lastKey가 존재할 때만 startAt 호출
      if (lastKey) {
        query.startAt(lastKey);
      }

      const result = await query.exec();

      allItems = allItems.concat(result as IAttendance[]);
      lastKey = result.lastKey as IAttendanceKey | undefined;
    } while (lastKey);

    // 클라이언트 개발자 요청: 누락된 필드들을 null로 정규화
    return allItems.map((item) => normalizeAttendance(item));
  }
}
