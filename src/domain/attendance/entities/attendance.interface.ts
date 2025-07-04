import { AttendanceStatus } from 'src/common/enums';
import { Departure } from 'src/domain/departure/entities/departure.entity';

export interface IAttendanceKey {
  groupKey: string; // partition key, e.g. "GROUP#1"
  dailyStudentKey: string; // sort key, e.g. "DATE#2025-05-01#STUDENT#1학년1반-10"
}

export interface IAttendanceCore extends IAttendanceKey {
  lessonId?: number;
  lessonName?: string;
  groupId?: number;
  groupName?: string;
  studentId?: number;
  studentName?: string;
  start?: string; // e.g. "14:00"
  end?: string; // e.g. "14:40"
  duration?: number; // e.g. 40
  status?: AttendanceStatus;
  expires?: number; // for 400 days (a bit longer than 365 days)
}

export interface IAttendance extends IAttendanceCore {
  parentNote?: string | null;
  parentNotedAt?: Date | null;
  schoolNote?: string | null;
  schoolNotedAt?: Date | null;
}

export interface IAttendanceWithNextInfo extends IAttendance {
  next: string; // Next class name or student's nextStop
  student?: any; // Student entity with parent info
  departure?: Departure | null; // Departure entity with schoolday info
}
