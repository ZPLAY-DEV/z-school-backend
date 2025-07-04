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
 * Convert DynamoDB item to IAttendance (Number timestamps -> Date objects)
 * Also converts createdAt, updatedAt for consistency with MySQL data
 */
export function fromDynamoItem(item: Record<string, any>): IAttendance {
  const converted = {
    ...item,
    parentNotedAt:
      typeof item.parentNotedAt === 'number'
        ? new Date(item.parentNotedAt)
        : null,
    schoolNotedAt:
      typeof item.schoolNotedAt === 'number'
        ? new Date(item.schoolNotedAt)
        : null,
    // Convert DynamoDB timestamps to Date objects for consistency
    ...(typeof item.createdAt === 'number' && {
      createdAt: new Date(item.createdAt),
    }),
    ...(typeof item.updatedAt === 'number' && {
      updatedAt: new Date(item.updatedAt),
    }),
  };

  return converted as IAttendance;
}

/**
 * Convert IAttendance to DynamoDB item (Date objects -> Number timestamps)
 */
export function toDynamoItem(
  attendance: Partial<IAttendance>,
): Record<string, any> {
  return {
    ...attendance,
    parentNotedAt: attendance.parentNotedAt?.getTime() ?? null,
    schoolNotedAt: attendance.schoolNotedAt?.getTime() ?? null,
  };
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
