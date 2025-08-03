import {
  IAttendance,
  IAttendanceCore,
} from 'src/domain/attendance/entities/attendance.interface';
import { AttendanceReport } from 'src/domain/attendance/types/attendance.types';

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

export function getStudentIdFromDailyStudentKey(
  dailyStudentKey: string,
): number {
  return Number(dailyStudentKey.split('#')[3]);
}

/**
 * Generate daily student key for DynamoDB
 */
export function generateDailyStudentKey(
  localDateStr: string,
  studentId: number,
  grade: number,
  klass: string,
  studentCode: number,
): string {
  const zeroPaddedCode = studentCode.toString().padStart(2, '0');
  const studentCodeStr = `${grade}-${klass}-${zeroPaddedCode}`;
  return `DATE#${localDateStr}#STUDENT#${studentId}#${studentCodeStr}`;
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
      attendances: { date: string; status: string }[];
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
