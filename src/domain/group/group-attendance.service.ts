import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays, getDay, lastDayOfMonth, parse } from 'date-fns';
import * as ExcelJS from 'exceljs';
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
  fetchAllAttendanceItems,
  filterNoSql,
  generateDailyStudentKey,
  generateGroupKey,
  getDateFromDailyStudentKey,
  getDatePrefixFromDailyStudentKey,
  getGroupIdFromGroupKey,
  getStudentIdFromDailyStudentKey,
  processAttendanceReport,
} from 'src/domain/attendance/utils/attendance.utils';
import { Departure } from 'src/domain/departure/entities/departure.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { areTheyEqual } from 'src/helpers/array';
import { translateActor } from 'src/helpers/translate';
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
    // 1) 관계 데이터 로드
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

    // ✅ upsert용 데이터 준비 (기존 조회 불필요)
    const upsertData: Partial<IAttendance> = {
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
    };

    // parentNote가 업데이트되는 경우에만 parentNotedAt 설정
    if (typeof dto.parentNote === 'string') {
      upsertData.parentNotedAt = new Date();
    }

    // schoolNote가 업데이트되는 경우에만 schoolNotedAt 설정 (주석 해제시)
    // if (typeof dto.schoolNote === 'string') {
    //   upsertData.schoolNotedAt = new Date();
    // }

    try {
      // ✅ 개선된 upsert: update 먼저 시도, 실패하면 create
      let result: IAttendance;

      try {
        // 1차 시도: update (기존 아이템 업데이트)
        result = await this.model.update(itemKey, upsertData);
      } catch (updateError: any) {
        // update 실패시 (아이템이 없거나 다른 이유) create 시도
        if (
          updateError.message?.includes('no item found') ||
          updateError.name === 'ValidationException'
        ) {
          result = await this.model.create({
            ...itemKey,
            ...upsertData,
          });
        } else {
          throw updateError;
        }
      }

      // forgot to update schoolday.dailyStudentKeys
      await this.updateSchooldayDailyStudentKeys(schoolday, dailyStudentKey);

      return result;
    } catch (err: any) {
      console.error(`[dynamoose v4] upsert error`, err);

      // DynamoDB 특화 에러 처리
      if (err.name === 'ConditionalCheckFailedException') {
        throw new BadRequestException(
          '출석 데이터 업데이트 조건이 맞지 않습니다.',
        );
      }
      if (err.name === 'ValidationException') {
        throw new BadRequestException(`데이터 검증 실패: ${err.message}`);
      }

      throw new BadRequestException(`출석 데이터 upsert 실패: ${err.message}`);
    }
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
      const allItems: IAttendance[] = await fetchAllAttendanceItems(
        this.model,
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

      const filteredPicks = picks.filter((v) => {
        if (v.startedBy !== null && v.start >= date) {
          return false;
        }
        if (v.endedBy !== null && v.end <= date) {
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
              groupKey: generateGroupKey(pick.group.id),
              lessonId: pick.group.lessonId,
              lessonName: pick.group.lesson.lessonName,
              groupName: pick.group.groupName,
              weekday: pick.group.weekday,
              studentId: pick.student.id,
              studentName: pick.student.name,
              dailyStudentKey: dailyStudentKey,
              status: AttendanceStatus.NONE,
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

    // 10. 헤더 스타일링
    const headerRowObj = sheet.getRow(sheet.rowCount);
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

    const comments: string[] = ['특이사항:'];

    // 11. 학생별 출석 데이터 추가
    group.picks.forEach((pick, index) => {
      const student = pick.student;
      const rowData = [
        index + 1, // 순번
        `${student.grade}학년 ${student.class}반 ${student.studentCode}번`, // 학년,반,번호
        student.name, // 이름
      ];
      if (pick.startedBy && pick.start.toString().startsWith(date)) {
        comments.push(
          `${pick.student.name} 학생 ${pick.start} 등록 (${translateActor(pick.startedBy)})`,
        );
      }
      if (pick.endedBy && pick.end.toString().startsWith(date)) {
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
            case AttendanceStatus.EXCUSED_LATE:
              statusText = '지각';
              break;
            case AttendanceStatus.LEFT:
            case AttendanceStatus.EXCUSED_LEFT:
              statusText = '조퇴';
              break;
            case AttendanceStatus.INIT:
              statusText = '수업전';
              break;
            default:
              statusText = '';
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

  async getMonthlyReport(
    groupId: number,
    date: string, //? "2025-08"
  ): Promise<AttendanceReport[]> {
    const items = await this.findAttendancesByMonth(groupId, date);

    return processAttendanceReport(items);
  }

  async getStudentMonthlyReport(
    groupId: number,
    date: string, //? "2025-08"
    studentId: number,
  ): Promise<IAttendance[]> {
    const year = Number(date.split('-')[0]);
    const month = Number(date.split('-')[1]);
    const startOfMonth = new Date(year, month - 1, 1); // 월은 0-based
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999); // 다음 달의 0일 = 이번 달의 마지막 날 (23:59:59.999까지 포함)

    const student = await this.studentRepository.findOne({
      where: { id: studentId },
    });

    const queryBuilder = this.schooldayRepository
      .createQueryBuilder('schoolday')
      .leftJoinAndSelect('schoolday.group', 'group')
      .where('schoolday.groupId = :groupId', { groupId })
      .andWhere('schoolday.startsAt BETWEEN :beginning AND :ending', {
        beginning: startOfMonth,
        ending: endOfMonth,
      });
    const schooldays = await queryBuilder.getMany();
    const dateMap = new Map<
      string,
      Schoolday & { group: Group; weekNumber: number }
    >(
      schooldays.map((v) => [
        `DATE#${v.today}`,
        { ...v, group: v.group, weekNumber: v.weekNumber },
      ]),
    );
    const allItems: IAttendance[] = await fetchAllAttendanceItems(
      this.model,
      groupId,
      date,
    );

    return Array.from(dateMap.keys()).map((v) => {
      return {
        ...(allItems.find(
          (i) =>
            getStudentIdFromDailyStudentKey(i.dailyStudentKey) === studentId &&
            getDatePrefixFromDailyStudentKey(i.dailyStudentKey) === v,
        ) ||
          ({
            groupId: dateMap.get(v)?.group.id,
            start: dateMap.get(v)?.group.start,
            end: dateMap.get(v)?.group.end,
            groupKey: generateGroupKey(groupId),
            lessonId: dateMap.get(v)?.lessonId,
            lessonName: dateMap.get(v)?.name,
            groupName: dateMap.get(v)?.group.groupName,
            weekday: dateMap.get(v)?.group.weekday,
            studentId: studentId,
            studentName: student?.name || '학생명',
            dailyStudentKey: generateDailyStudentKey(
              v.slice(5),
              studentId,
              student?.grade || 1,
              student?.class || '1',
              student?.studentCode || 1,
            ),
            status: AttendanceStatus.NONE,
          } as IAttendance)),
        weekNumber: dateMap.get(v)?.weekNumber,
        dateStr: v.slice(5),
      };
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Private Utility Methods
  //? ---------------------------------------------------------------------- ?//

  private async findAttendancesByMonth(
    groupId: number,
    date: string, //? `2025-08` (월 단위)
  ): Promise<IAttendance[]> {
    const year = Number(date.split('-')[0]);
    const month = Number(date.split('-')[1]);
    const startOfMonth = new Date(year, month - 1, 1); // 월은 0-based
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999); // 다음 달의 0일 = 이번 달의 마지막 날 (23:59:59.999까지 포함)

    try {
      // 1. 해당 반 수업이 있는 날짜 및 수업시간 조회
      const schooldays = await this.schooldayRepository.find({
        where: {
          groupId: groupId,
          startsAt: Between(startOfMonth, endOfMonth),
        },
      });

      if (!schooldays || schooldays.length === 0) {
        return [];
      }

      // 2. schooldays 에 연관된 모든 attendance 데이터 조회 (DynamoDB)
      const allItems: IAttendance[] = await fetchAllAttendanceItems(
        this.model,
        groupId,
        date,
      );

      // 3. 출석부 레코드를 dailyStudentKey로 맵핑
      const itemMap = new Map<string, IAttendance>(
        allItems.map((v) => [v.dailyStudentKey, v]),
      );

      // 4. 반의 학생 아이디 추출 (picks 와 dynamo 둘 다)
      const picks = await this.pickRepository.find({
        where: [{ groupId }],
        relations: ['group', 'group.lesson', 'student'],
      });
      const studentIdsFromPicks = picks.map((pick) => pick.studentId);
      const studentIdsFromDynamoDb = [
        ...new Set(
          Array.from(itemMap.keys()).map((v) => {
            return getStudentIdFromDailyStudentKey(v);
          }),
        ),
      ];

      if (!areTheyEqual(studentIdsFromPicks, studentIdsFromDynamoDb)) {
        throw new Error('dynamo entries not matched');
      }

      // 5. 각 수업일별로 attendance 생성
      const attendances: IAttendance[] = [];

      for (const schoolday of schooldays) {
        console.log(`🔄 Processing schoolday: ${schoolday.today}`);

        for (const pick of picks) {
          const groupKey = generateGroupKey(pick.group.id);
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
              status: AttendanceStatus.NONE,
            } as IAttendance);

          attendances.push(attendance);
        }
      }

      console.log(`🎯 Final result: ${attendances.length} attendances`);

      return attendances;
    } catch (error) {
      console.error(`[dynamodb] error`, error);
      throw new BadRequestException(
        error.message || '출석 정보 조회에 실패했습니다.',
      );
    }
  }

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

  private getStudentEscort(date: string, stops?: IDailyEscort[]): IDailyEscort {
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

  private translateStatusStartContext(status: AttendanceStatus): string {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return '출석';
      case AttendanceStatus.ABSENT:
        return '결석';
      case AttendanceStatus.LATE:
        return '지각';
      case AttendanceStatus.PENDING:
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
      case AttendanceStatus.PENDING:
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
