import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import {
  ATTENDANCE_CONSTANTS,
  AttendanceItem,
} from 'src/domain/attendance/types/attendance.types';

/**
 * Convert Date to local date string in Korean timezone
 */
export function formatToLocalDateString(date: Date): string {
  return format(
    toZonedTime(date, ATTENDANCE_CONSTANTS.TIME_ZONE),
    'yyyy-MM-dd',
  );
}

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
    Math.floor(startsAt.getTime() / 1000) +
    60 * 60 * 24 * ATTENDANCE_CONSTANTS.TTL_DAYS
  );
}

/**
 * Builds DynamoDB item by filtering out undefined values (NoSQL best practice)
 */
export function buildAttendanceItem(item: AttendanceItem): AttendanceItem {
  const result: Partial<AttendanceItem> = {};
  for (const [key, value] of Object.entries(item)) {
    if (value !== undefined) {
      result[key as keyof AttendanceItem] = value;
    }
  }
  return result as AttendanceItem;
}
