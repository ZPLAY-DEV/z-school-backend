import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import {
  IAttendance,
  IAttendanceCore,
} from 'src/domain/attendance/entities/attendance.interface';
import { AttendanceReport } from 'src/domain/attendance/types/attendance.types';

/**
 * Generate group key for DynamoDB
 */
export function generateGroupKey(groupId: number): string {
  return `GROUP#${groupId}`;
}

/**
 * Generate daily student key for DynamoDB
 */
export function generateDailyStudentKey(
  localDateStr: string,
  studentId: number,
  grade: string,
  klass: string,
  studentCode: number,
): string {
  const zeroPaddedCode = studentCode.toString().padStart(2, '0');
  const studentCodeStr = `${grade}-${klass}-${zeroPaddedCode}`;
  return `DATE#${localDateStr}#STUDENT#${studentId}#${studentCodeStr}`;
}

/**
 * Calculate TTL expiration timestamp
 */
export function calculateTtl(startsAt: Date): number {
  return (
    Math.floor(startsAt.getTime() / 1000) + 60 * 60 * 24 * 365 // 365일 TTL
  );
}

/**
 * Convert Date to local date string in Korean timezone
 */
export function formatDateInKST(date: Date): string {
  return format(toZonedTime(date, 'Asia/Seoul'), 'yyyy-MM-dd');
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
