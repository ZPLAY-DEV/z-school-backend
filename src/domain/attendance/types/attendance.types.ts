import { AttendanceStatus } from 'src/common/enums';
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

export type AttendanceStatusRequest = {
  groupKey: string;
  dailyStudentKey: string;
  status: AttendanceStatus;
};

export interface AttendanceReportItem {
  date: string;
  weekday: string;
  weekNumber: number;
  status: string;
}

export interface AttendanceReport {
  studentKey: string;
  studentName: string;
  attendances: AttendanceReportItem[];
}
