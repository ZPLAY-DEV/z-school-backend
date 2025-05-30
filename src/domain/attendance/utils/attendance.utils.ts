import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import {
  ATTENDANCE_CONSTANTS,
  AttendanceItem,
  AttendanceRecordParams,
} from 'src/domain/attendance/types/attendance.types';
import { getDigitStudentId, getStudentId } from 'src/helpers/student';

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
  grade: string,
  studentClass: string | null,
  studentCode: number | null,
): string {
  const digitStudentId = getDigitStudentId(grade, studentClass, studentCode);
  return `DATE#${localDateStr}#STUDENT#${digitStudentId}`;
}

/**
 * Generate student ID string
 */
export function generateStudentId(
  grade: string,
  studentClass: string | null,
  studentCode: number | null,
): string {
  return getStudentId(grade, studentClass, studentCode);
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
export function buildAttendanceItem(
  item: AttendanceRecordParams,
): AttendanceItem {
  const result: Partial<AttendanceItem> = {};
  for (const [key, value] of Object.entries(item)) {
    if (value !== undefined) {
      result[key as keyof AttendanceItem] = value;
    }
  }
  return result as AttendanceItem;
}
