import { IAttendance } from 'src/domain/attendance/entities/attendance.interface';

export interface AttendanceWithLastFlagDto extends IAttendance {
  isLast: boolean;
}
