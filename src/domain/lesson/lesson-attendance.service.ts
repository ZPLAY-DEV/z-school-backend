import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { lastDayOfMonth } from 'date-fns';
import * as ExcelJS from 'exceljs';
import { InjectModel, Model } from 'nestjs-dynamoose';
import { AttendanceStatus } from 'src/common/enums';
import {
  IAttendance,
  IAttendanceKey,
} from 'src/domain/attendance/entities/attendance.interface';
import { AttendanceReport } from 'src/domain/attendance/types/attendance.types';
import {
  generateDailyStudentKey,
  generateGroupKey,
  getDateFromDailyStudentKey,
  getStudentIdFromDailyStudentKey,
  processAttendanceReport,
} from 'src/domain/attendance/utils/attendance.utils';
import { Departure } from 'src/domain/departure/entities/departure.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { areTheyEqual } from 'src/helpers/array';
import { translateActor } from 'src/helpers/translate';
import { Between, In, Repository } from 'typeorm';

@Injectable()
export class LessonAttendanceService {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
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
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  // 그날의 extended 출석부 정보
  //! groupId 를 지정해야지만 다음 수업찾기 가능하다. 따라서 NextStop 찾기 불가능.
  async findExtendedAttendancesByDate(
    lessonId: number,
    date: string, //! "2025-06-06"
  ): Promise<IAttendance[]> {
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: { groups: true },
    });
    if (!lesson) {
      throw new NotFoundException(`Lesson not found`);
    }
    if (!lesson.groups || lesson.groups.length === 0) {
      throw new NotFoundException(`Groups not found`);
    }
    const groupIds = lesson.groups.map((group) => group.id);

    try {
      // 1. 해당 날짜에 수업이 있는 그룹들만 필터링
      const schooldays = await this.schooldayRepository.find({
        where: {
          groupId: In(groupIds),
          today: date,
        },
      });
      if (!schooldays || schooldays.length === 0) {
        return [];
      }

      // 2. DynamoDB에서 출석 데이터 조회
      const groupAttendanceItems = await Promise.all(
        groupIds.map(async (groupId) => {
          return await this.fetchAllAttendanceItems(groupId, date);
        }),
      );
      const allItems = groupAttendanceItems.flat();

      // 3. 출석 레코드를 dailyStudentKey로 맵핑
      const itemMap = new Map<string, IAttendance>(
        allItems.map((v) => [v.dailyStudentKey, v]),
      );

      // 4. 등록된 학생들(picks) 조회
      const picks =
        (await this.pickRepository.find({
          where: { groupId: In(groupIds) },
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

      // 8. 학생 ID를 key로 하는 student Map 생성 (빠른 lookup을 위해)
      const studentMap = new Map(
        students.map((student) => [student.id, student]),
      );

      // 9. 출석 데이터에 학생 정보 추가
      completeAttendanceItems.forEach((item) => {
        const student = studentMap.get(item.studentId!);
        if (student) {
          item.student = student;
        }
      });
      return completeAttendanceItems;
    } catch (error) {
      console.error(`[dynamodb] error`, error);
      throw new BadRequestException(`DynamoDB read error: ${error.message}`);
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Report
  //? ---------------------------------------------------------------------- ?//

  async generateExcel(
    lessonId: number,
    date: string, // "2025-08"
  ): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();

    // 1. 그룹 정보 조회
    const lesson = await this.lessonRepository.findOneOrFail({
      where: { id: lessonId },
      relations: [
        'groups',
        'groups.schooldays',
        'groups.picks',
        'groups.picks.student',
      ],
    });

    // 2. 해당 월 출석 데이터 조회
    const attendances = await this.findAttendancesByMonth(lessonId, date);

    // 3. 출석 Map 변환
    const attendanceMap = new Map<string, IAttendance>();
    attendances.forEach((attendance) => {
      const d = getDateFromDailyStudentKey(attendance.dailyStudentKey);
      const studentId = getStudentIdFromDailyStudentKey(
        attendance.dailyStudentKey,
      );
      attendanceMap.set(`${d}_${studentId}`, attendance);
    });

    // 4. 전체 sheet 준비
    const overallSheet = workbook.addWorksheet('전체');
    const overallComments: string[] = ['특이사항:'];
    let maxColumns = 3; // 기본 컬럼 3개 (순번, 학년·반·번호, 이름)

    // 5. 반별 sheet 생성 + 전체 sheet 이어붙이기
    for (const [groupIndex, group] of lesson.groups.entries()) {
      // 월별 수업일 필터링
      const monthSchooldays = group.schooldays
        .filter((s) => s.today.startsWith(date))
        .sort((a, b) => a.today.localeCompare(b.today));

      if (monthSchooldays.length === 0) continue;

      // 최대 컬럼 수 계산
      const currentColumns = 3 + monthSchooldays.length;
      if (currentColumns > maxColumns) {
        maxColumns = currentColumns;
      }

      // 개별 그룹 sheet 생성
      this.createGroupSheet(
        workbook,
        lesson,
        group,
        date,
        monthSchooldays,
        attendanceMap,
      );

      // 전체 sheet 에 그룹 출석부 추가
      this.appendGroupToOverallSheet(
        overallSheet,
        lesson,
        group,
        date,
        monthSchooldays,
        attendanceMap,
      );
    }

    return workbook;
  }

  /**
   * 각각의 반별 출석부 sheet 생성
   */
  private createGroupSheet(
    workbook: ExcelJS.Workbook,
    lesson: Lesson,
    group: Group,
    date: string,
    monthSchooldays: Schoolday[],
    attendanceMap: Map<string, IAttendance>,
  ) {
    const year = Number(date.split('-')[0]);
    const month = Number(date.split('-')[1]);
    const firstDay = `${month}월 1일`;
    const lastDay = `${month}월 ${lastDayOfMonth(new Date(year, month - 1, 1)).getDate()}일`;
    const sheet = workbook.addWorksheet(group.groupName);
    const lastCol = String.fromCharCode(65 + monthSchooldays.length + 2);
    const comments: string[] = ['특이사항:'];

    // 서명칸
    const col1 = monthSchooldays.length + 1;
    const col2 = monthSchooldays.length + 2;
    const col3 = monthSchooldays.length + 3;
    const row5 = sheet.addRow([]);
    [col1, col2, col3].forEach((c, i) => {
      const names = ['강사', '담당', '실장'];
      const cell = row5.getCell(c);
      cell.value = names[i];
      cell.alignment = { horizontal: 'center' };
      cell.font = { bold: true };
    });
    const row6 = sheet.addRow([]);
    const row7 = sheet.addRow([]);
    [col1, col2, col3].forEach((c) => {
      sheet.mergeCells(
        `${String.fromCharCode(65 + c - 1)}${row6.number}:${String.fromCharCode(
          65 + c - 1,
        )}${row7.number}`,
      );
    });
    [row5, row6, row7].forEach((r) => {
      [col1, col2, col3].forEach((c) => {
        r.getCell(c).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // breathing row #1
    const br1 = sheet.addRow(['']);
    sheet.mergeCells(`A${br1.number}:${lastCol}${br1.number}`);

    // 타이틀
    const titleRow = sheet.addRow([
      `${year}년 ${month}월 ${lesson.lessonName} - ${group.groupName}`,
    ]);
    titleRow.font = { bold: true, size: 16 };
    titleRow.alignment = { horizontal: 'center' };
    sheet.mergeCells(`A${titleRow.number}:${lastCol}${titleRow.number}`);

    // breathing row #2
    const br2 = sheet.addRow(['']);
    sheet.mergeCells(`A${br2.number}:${lastCol}${br2.number}`);

    // 수업기간 정보
    const infoRow = sheet.addRow([]);
    infoRow.height = 20;
    infoRow.font = { size: 10 };
    infoRow.getCell(1).value = `👤 강사: ${group.samName || '미지정'}`;
    infoRow.getCell(2).value =
      `⏰ ${group.weekday} ${group.start} ~ ${group.end}`;
    infoRow.getCell(3).value = `📆 ${firstDay} ~ ${lastDay}`;

    // breathing row #3
    const br3 = sheet.addRow(['']);
    sheet.mergeCells(`A${br3.number}:${lastCol}${br3.number}`);

    // 헤더
    const headerRow = ['순번', '학년·반·번호', '이름'];
    monthSchooldays.forEach((schoolday) => {
      const d = new Date(schoolday.today);
      headerRow.push(`${month}월 ${d.getDate()}일 (${schoolday.weekday})`);
    });
    const headerRowObj = sheet.addRow(headerRow);
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

    // 학생별 출석
    group.picks.forEach((pick, index) => {
      const student = pick.student;
      const rowData = [
        index + 1,
        `${student.grade}학년 ${student.class}반 ${student.studentCode}번`,
        student.name,
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

      monthSchooldays.forEach((schoolday) => {
        const key = `${schoolday.today}_${student.id}`;
        const attendance = attendanceMap.get(key);
        let statusText = '';
        if (attendance) {
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
          }
        }
        rowData.push(statusText);
      });
      const dataRow = sheet.addRow(rowData);
      dataRow.eachCell((cell, colNumber) =>
        this.styleAttendanceCell(cell, colNumber),
      );
    });

    // 열 너비 고정
    sheet.columns.forEach((c) => (c.width = 15));

    // breathing row #4
    const br4 = sheet.addRow(['']);
    sheet.mergeCells(`A${br4.number}:${lastCol}${br4.number}`);

    // 코멘트
    this.addComments(sheet, comments);
  }

  /**
   * 전체 출석부 sheet 생성
   */
  private appendGroupToOverallSheet(
    sheet: ExcelJS.Worksheet,
    lesson: Lesson,
    group: Group,
    date: string,
    monthSchooldays: Schoolday[],
    attendanceMap: Map<string, IAttendance>,
  ) {
    const year = Number(date.split('-')[0]);
    const month = Number(date.split('-')[1]);
    const firstDay = `${month}월 1일`;
    const lastDay = `${month}월 ${lastDayOfMonth(new Date(year, month - 1, 1)).getDate()}일`;
    const lastCol = String.fromCharCode(65 + monthSchooldays.length + 2);
    const comments: string[] = ['특이사항:'];

    // 서명칸
    const col1 = monthSchooldays.length + 1;
    const col2 = monthSchooldays.length + 2;
    const col3 = monthSchooldays.length + 3;
    const row5 = sheet.addRow([]);
    [col1, col2, col3].forEach((c, i) => {
      const names = ['강사', '담당', '실장'];
      const cell = row5.getCell(c);
      cell.value = names[i];
      cell.alignment = { horizontal: 'center' };
      cell.font = { bold: true };
    });
    const row6 = sheet.addRow([]);
    const row7 = sheet.addRow([]);
    [col1, col2, col3].forEach((c) => {
      sheet.mergeCells(
        `${String.fromCharCode(65 + c - 1)}${row6.number}:${String.fromCharCode(
          65 + c - 1,
        )}${row7.number}`,
      );
    });
    [row5, row6, row7].forEach((r) => {
      [col1, col2, col3].forEach((c) => {
        r.getCell(c).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // breathing row #1
    const br1 = sheet.addRow(['']);
    sheet.mergeCells(`A${br1.number}:${lastCol}${br1.number}`);

    // 타이틀
    const titleRow = sheet.addRow([
      `${year}년 ${month}월 ${lesson.lessonName} - ${group.groupName}`,
    ]);
    titleRow.font = { bold: true, size: 16 };
    titleRow.alignment = { horizontal: 'center' };
    sheet.mergeCells(`A${titleRow.number}:${lastCol}${titleRow.number}`);

    // breathing row #2
    const br2 = sheet.addRow(['']);
    sheet.mergeCells(`A${br2.number}:${lastCol}${br2.number}`);

    // 수업기간 정보
    const infoRow = sheet.addRow([]);
    infoRow.height = 20;
    infoRow.font = { size: 10 };
    infoRow.getCell(1).value = `👤 강사: ${group.samName || '미지정'}`;
    infoRow.getCell(2).value =
      `⏰ ${group.weekday} ${group.start} ~ ${group.end}`;
    infoRow.getCell(3).value = `📆 ${firstDay} ~ ${lastDay}`;

    // breathing row #3
    const br3 = sheet.addRow(['']);
    sheet.mergeCells(`A${br3.number}:${lastCol}${br3.number}`);

    // 헤더
    const headerRow = ['순번', '학년·반·번호', '이름'];
    monthSchooldays.forEach((schoolday) => {
      const d = new Date(schoolday.today);
      headerRow.push(`${month}월 ${d.getDate()}일 (${schoolday.weekday})`);
    });
    const headerRowObj = sheet.addRow(headerRow);
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

    // 학생별 출석
    group.picks.forEach((pick: Pick, index: number) => {
      const student = pick.student;
      const rowData = [
        index + 1,
        `${student.grade}학년 ${student.class}반 ${student.studentCode}번`,
        student.name,
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

      monthSchooldays.forEach((schoolday) => {
        const key = `${schoolday.today}_${student.id}`;
        const attendance = attendanceMap.get(key);
        let statusText = '';
        if (attendance) {
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
          }
        }
        rowData.push(statusText);
      });
      const dataRow = sheet.addRow(rowData);
      dataRow.eachCell((cell, colNumber) =>
        this.styleAttendanceCell(cell, colNumber),
      );
    });

    // 열 너비 고정
    sheet.columns.forEach((c) => (c.width = 15));
    // breathing row #4
    const br4 = sheet.addRow(['']);
    sheet.mergeCells(`A${br4.number}:${lastCol}${br4.number}`);

    // 코멘트
    this.addComments(sheet, comments);
  }

  /**
   * 출석 셀 스타일링
   */
  private styleAttendanceCell(cell: ExcelJS.Cell, colNumber: number) {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
    if (colNumber > 3) {
      const statusText = cell.value as string;
      if (statusText === '출석') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF90EE90' },
        };
      } else if (statusText === '결석') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFB6C1' },
        };
      } else if (statusText === '지각') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFD700' },
        };
      } else if (statusText === '조퇴') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF87CEEB' },
        };
      }
    }
  }

  /**
   * 코멘트 추가
   */
  private addComments(sheet: ExcelJS.Worksheet, comments: string[]) {
    comments.forEach((comment) => {
      sheet.addRow([comment]);
    });
  }

  async getMonthlyReport(
    lessonId: number,
    date: string, //? "2025-08"
  ): Promise<AttendanceReport[]> {
    const items = await this.findAttendancesByMonth(lessonId, date);

    return processAttendanceReport(items);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Private Utility Methods
  //? ---------------------------------------------------------------------- ?//

  private async findAttendancesByMonth(
    lessonId: number,
    date: string, //? `2025-08` (월 단위)
  ): Promise<IAttendance[]> {
    const year = Number(date.split('-')[0]);
    const month = Number(date.split('-')[1]);
    const startOfMonth = new Date(year, month - 1, 1); // 월은 0-based
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999); // 다음 달의 0일 = 이번 달의 마지막 날 (23:59:59.999까지 포함)

    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: { groups: true },
    });
    if (!lesson) {
      throw new NotFoundException(`Lesson not found`);
    }
    if (!lesson.groups || lesson.groups.length === 0) {
      throw new NotFoundException(`Groups not found`);
    }
    const groupIds = lesson.groups.map((group) => group.id);

    try {
      // 1. 해당 반 수업이 있는 날짜 및 수업시간 조회
      const schooldays = await this.schooldayRepository.find({
        where: {
          groupId: In(groupIds),
          startsAt: Between(startOfMonth, endOfMonth),
        },
      });

      if (!schooldays || schooldays.length === 0) {
        return [];
      }

      // 2. schooldays 에 연관된 모든 attendance 데이터 조회 (DynamoDB)
      const groupItems = await Promise.all(
        groupIds.map(async (groupId) => {
          const result = await this.fetchAllAttendanceItems(groupId, date);
          return result;
        }),
      );

      const allItems = groupItems.flat();

      // 3. 출석부 레코드를 dailyStudentKey로 맵핑
      const itemMap = new Map<string, IAttendance>(
        allItems.map((v) => [v.dailyStudentKey, v]),
      );

      // 4. 반의 학생 아이디 추출 (picks 와 dynamo 둘 다)
      const picks: Pick[] = [];
      for (const groupId of groupIds) {
        const groupPicks = await this.pickRepository.find({
          where: { groupId: groupId },
          relations: ['group', 'group.lesson', 'student'],
        });
        picks.push(...groupPicks);
      }
      const studentIdsFromPicks = [
        ...new Set(picks.map((pick) => pick.studentId)),
      ];
      const studentIdsFromDynamoDb = [
        ...new Set(
          Array.from(itemMap.keys()).map((v) => {
            return getStudentIdFromDailyStudentKey(v);
          }),
        ),
      ];

      if (!areTheyEqual(studentIdsFromPicks, studentIdsFromDynamoDb)) {
        console.log(`🔵 mysql`, studentIdsFromPicks);
        console.log(`🟢 dynamo`, studentIdsFromDynamoDb);
        throw new Error('dynamo entries not matched');
      }

      // 5. 각 수업일별로 attendance 생성
      const attendances: IAttendance[] = [];

      for (const schoolday of schooldays) {
        console.log(`🔄 Processing schoolday: ${schoolday.today}`);

        // 해당 수업일에 해당하는 그룹의 학생들만 필터링
        const relevantPicks = picks.filter(
          (pick) => pick.groupId === schoolday.groupId,
        );

        for (const pick of relevantPicks) {
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
              groupKey: generateGroupKey(pick.group.id),
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
      throw new BadRequestException(`DynamoDB read error: ${error.message}`);
    }
  }

  private async fetchAllAttendanceItems(groupId: number, date: string) {
    let allItems: IAttendance[] = [];
    let lastKey: IAttendanceKey | undefined = undefined;
    const groupKey = generateGroupKey(groupId);

    console.log(`🟢 groupKey`, groupKey, `DATE#${date}`);

    do {
      const query = this.model
        .query('groupKey')
        .eq(groupKey)
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

    return allItems;
  }
}
