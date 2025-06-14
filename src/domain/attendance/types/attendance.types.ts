import { IAttendanceCore } from 'src/domain/attendance/entities/attendance.interface';

export type WriteRequest = {
  PutRequest: {
    Item: IAttendanceCore;
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
