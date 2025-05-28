import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel, Model } from 'nestjs-dynamoose';
import {
  IAttendance,
  IAttendanceKey,
} from 'src/domain/attendance/entities/attendance.interface';

@Injectable()
export class GroupAttendanceService {
  constructor(
    @InjectModel('Attendance')
    private readonly model: Model<IAttendance, IAttendanceKey>,
  ) {}

  async findByDate(groupKey: string, date: string): Promise<IAttendance[]> {
    try {
      const prefix = `DATE#${date}`;
      const result = await this.model
        .query('groupKey')
        .eq(groupKey)
        .where('dailyStudentKey')
        .beginsWith(prefix)
        .exec();
      return result as IAttendance[];
    } catch (error) {
      console.error(`[dynamodb] error`, error);
      throw new BadRequestException(error);
    }
  }
}
