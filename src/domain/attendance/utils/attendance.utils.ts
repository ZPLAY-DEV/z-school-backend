import { AttendanceStatus } from 'src/common/enums';
import {
  IAttendance,
  IAttendanceCore,
  IAttendanceKey,
} from 'src/domain/attendance/entities/attendance.interface';
import {
  AttendanceReport,
  AttendanceReportItem,
} from 'src/domain/attendance/types/attendance.types';

export function filterNoSql<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null),
  ) as Partial<T>;
}

/**
 * Generate group key for DynamoDB
 */
export function generateGroupKey(groupId: number): string {
  return `GROUP#${groupId}`;
}

export function getGroupIdFromGroupKey(groupKey: string): number {
  return Number(groupKey.split('#')[1]);
}

export function getDateFromDailyStudentKey(dailyStudentKey: string): string {
  return dailyStudentKey.split('#')[1];
}

export function getDatePrefixFromDailyStudentKey(
  dailyStudentKey: string,
): string {
  return `DATE#${dailyStudentKey.split('#')[1]}`;
}

export function getStudentIdFromDailyStudentKey(
  dailyStudentKey: string,
): number {
  return Number(dailyStudentKey.split('#')[3]);
}

/**
 * Generate daily student key for DynamoDB
 */
export function generateDailyStudentKey(
  dateStr: string,
  studentId: number,
  grade: number,
  klass: string,
  studentCode: number,
): string {
  const zeroPaddedCode = studentCode.toString().padStart(2, '0');
  const studentCodeStr = `${grade}-${klass}-${zeroPaddedCode}`;
  return `DATE#${dateStr}#STUDENT#${studentId}#${studentCodeStr}`;
}

/**
 * Builds DynamoDB item by filtering out undefined values (NoSQL best practice)
 */
export function buildAttendanceItem(item: IAttendanceCore): IAttendanceCore {
  const result: Partial<IAttendanceCore> = {};
  for (const [key, value] of Object.entries(item)) {
    if (value !== undefined) {
      result[key as keyof IAttendanceCore] = value;
    }
  }
  return result as IAttendanceCore;
}

/**
 * Convert comma separated rangeKeys string to array
 */
export function parseRangeKeys(rangeKeys: string): string[] {
  if (!rangeKeys || rangeKeys.trim() === '') {
    return [];
  }
  return rangeKeys
    .split(',')
    .map((key) => key.trim())
    .filter((key) => key.length > 0);
}

/**
 * Process attendance items into AttendanceReport array
 * Extracts common logic for grouping and formatting attendance data
 */
export function processAttendanceReport(
  items: IAttendance[],
): AttendanceReport[] {
  // Group attendance records by studentKey
  const groupedByStudent = new Map<
    string,
    {
      studentName: string;
      attendances: AttendanceReportItem[];
    }
  >();

  for (const item of items) {
    // Extract studentKey from dailyStudentKey
    // dailyStudentKey format: "DATE#2025-05-01#STUDENT#1#4-4-55"
    const parts = item.dailyStudentKey.split('#');
    if (parts.length < 5) continue;

    const studentKey = parts[parts.length - 1]; // Last part is studentKey (e.g., "4-4-55")
    const date = parts[1]; // Second part is date (e.g., "2025-05-01")

    if (!groupedByStudent.has(studentKey)) {
      groupedByStudent.set(studentKey, {
        studentName: item.studentName || '',
        attendances: [],
      });
    }

    const studentData = groupedByStudent.get(studentKey)!;
    studentData.attendances.push({
      date,
      weekday: item.weekday,
      weekNumber: item.weekNumber,
      status: item.status || 'PENDING',
    });
  }

  // Convert Map to AttendanceReport array
  const reports: AttendanceReport[] = [];
  for (const [studentKey, data] of groupedByStudent.entries()) {
    reports.push({
      studentKey,
      studentName: data.studentName,
      attendances: data.attendances.sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    });
  }

  return reports.sort((a, b) => a.studentKey.localeCompare(b.studentKey));
}

/**
 * Normalize attendance item by ensuring all optional fields are present with null values
 * This ensures consistent API response format across all attendance endpoints
 */
export function normalizeAttendance(attendance: IAttendance): IAttendance {
  return {
    ...attendance,
    parentNote: attendance.parentNote ?? null,
    parentNotedAt: attendance.parentNotedAt ?? null,
    schoolNote: attendance.schoolNote ?? null,
    schoolNotedAt: attendance.schoolNotedAt ?? null,
  };
}

/**
 * Normalize array of attendance items
 */
export function normalizeAttendances(
  attendances: IAttendance[],
): IAttendance[] {
  return attendances.map(normalizeAttendance);
}

export async function fetchAllAttendanceItems(
  model,
  groupId: number,
  date: string,
) {
  let allItems: IAttendance[] = [];
  let lastKey: IAttendanceKey | undefined = undefined;

  do {
    const query = model
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

  return allItems;
}

/**
 * Create fallback attendance item when DynamoDB record doesn't exist
 * @param schoolday - Schoolday entity with group and lesson relations
 * @param studentId - Student ID
 * @param groupKey - Group key for DynamoDB
 * @returns Fallback attendance item
 */
export function createFallbackAttendanceItem(
  schoolday: {
    today: string;
    lessonId: number;
    groupId: number;
    id: number;
    weekNumber?: number;
    group?: {
      lesson?: { lessonName?: string };
      groupName?: string;
      start?: string;
      end?: string;
      weekday?: string;
      picks?: Array<{
        studentId: number;
        student?: {
          id: number;
          name?: string;
          grade: number;
          class: string;
          studentCode: number;
        };
      }>;
    };
  },
  studentId: number,
  groupKey: string,
): IAttendance {
  // schoolday.group.picks에서 해당 student 찾기
  const pick = schoolday.group?.picks?.find(
    (p: any) => p.studentId === studentId,
  );
  if (!pick || !pick.student) {
    throw new Error('Student information not found in schoolday');
  }

  return {
    groupKey: groupKey,
    dailyStudentKey: generateDailyStudentKey(
      schoolday.today,
      pick.student.id,
      pick.student.grade,
      pick.student.class,
      pick.student.studentCode,
    ),
    lessonId: schoolday.lessonId,
    lessonName: schoolday.group?.lesson?.lessonName || '수업명',
    groupId: schoolday.groupId,
    groupName: schoolday.group?.groupName || '그룹명',
    studentId: studentId,
    studentName: pick.student.name || '학생명',
    start: schoolday.group?.start || '09:00',
    end: schoolday.group?.end || '10:00',
    weekday: schoolday.group?.weekday || '월',
    status: AttendanceStatus.NONE,
    weekNumber: schoolday.weekNumber,
  } as IAttendance;
}
