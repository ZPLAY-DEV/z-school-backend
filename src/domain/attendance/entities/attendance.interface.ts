import { AttendanceStatus } from 'src/common/enums';
import { Departure } from 'src/domain/departure/entities/departure.entity';
import { Student } from 'src/domain/student/entities/student.entity';

export interface IAttendanceKey {
  groupKey: string; // partition key, e.g. "GROUP#1"
  dailyStudentKey: string; // sort key, e.g. "DATE#2025-05-01#STUDENT#1-1-1"
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
  weekday?: string; // e.g. '월'
  status?: AttendanceStatus;
  expires?: number; // for 400 days (a bit longer than 365 days)
  student?: Student;
}

export interface IAttendance extends IAttendanceCore {
  parentNote?: string | null;
  parentNotedAt?: Date | null;
  schoolNote?: string | null;
  schoolNotedAt?: Date | null;
  createdAt?: Date; // Dynamoose timestamps
  updatedAt?: Date; // Dynamoose timestamps
}

export interface IAttendanceWithNextStop extends IAttendance {
  next: string; // Next class name or student's nextStop
  departure?: Departure | null; // Departure entity with schoolday info
  isLast?: boolean; // 마지막 그룹임
}
