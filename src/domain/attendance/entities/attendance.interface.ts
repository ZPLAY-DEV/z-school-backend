export interface IAttendanceKey {
  groupKey: string; // partition key, e.g. "GROUP#1"
  dailyStudentKey: string; // sort key, e.g. "DATE#2025-05-01#STUDENT#1학년1반-10"
}

export interface IAttendance extends IAttendanceKey {
  lessonId?: number;
  lessonName?: string;
  groupId?: number;
  groupName?: string;
  studentId?: number;
  studentName?: string;
  start?: string; // e.g. "14:00"
  end?: string; // e.g. "14:40"
  duration?: number; // e.g. 40
  status?: 'PENDING' | 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED_ABSENT';
  parentNote?: string;
  schoolNote?: string;
  isRead?: boolean;
  expires?: number;
}
