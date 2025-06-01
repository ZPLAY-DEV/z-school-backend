// Common types and constants for attendance operations
export const ATTENDANCE_CONSTANTS = {
  TIME_ZONE: 'Asia/Seoul',
  BATCH_SIZE: 25,
  MAX_RETRIES: 5,
  BASE_DELAY: 100, // ms
  TTL_DAYS: 365,
} as const;

export type WriteRequest = {
  PutRequest: {
    Item: AttendanceItem;
  };
};

export type DeleteRequest = {
  DeleteRequest: {
    Key: {
      groupKey: string;
      dailyStudentKey: string;
    };
  };
};

export interface AttendanceItem {
  groupKey: string;
  dailyStudentKey: string;
  lessonId: number;
  lessonName: string;
  groupId: number;
  groupName: string;
  studentId: number;
  studentName: string;
  start: string;
  end: string;
  duration: number;
  status: string;
  expires: number;
}

export interface BatchResult {
  total: number;
  failedBatches: number;
}

export interface AttendanceReportItem {
  date: string;
  status: string;
}

export interface AttendanceReport {
  studentKey: string;
  studentName: string;
  attendances: AttendanceReportItem[];
}
