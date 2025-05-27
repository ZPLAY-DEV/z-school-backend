import { BadRequestException, Injectable } from '@nestjs/common';
import { SortOrder } from 'dynamoose/dist/General';
import { InjectModel, Model } from 'nestjs-dynamoose';
import { CreateAttendanceDto } from 'src/domain/attendance/dto/create-attendance.dto';
import { UpdateAttendanceDto } from 'src/domain/attendance/dto/update-attendance.dto';
import {
  IAttendance,
  IAttendanceKey,
} from 'src/domain/attendance/entities/attendance.interface';

const LIMIT = 10;

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel('Attendance')
    private readonly model: Model<IAttendance, IAttendanceKey>,
  ) {}

  //? notice that even if you provide createdAt and updatedAt in the payload
  //? dynamodb will ignore them and record the timestamps with its own value.
  //?
  async create(dto: CreateAttendanceDto): Promise<IAttendance> {
    try {
      const attendance = await this.model.create({
        ...dto,
        parentNote: dto.parentNote ?? null,
        schoolNote: dto.schoolNote ?? null,
      });
      return attendance as IAttendance;
    } catch (error) {
      console.error(`[dynamodb] error`, error);
      throw new BadRequestException(error);
    }
  }

  //? notice that records will be sorted by range key, which is id
  //? (in m## format string; xx is milliseconds).
  //?
  async fetch(groupKey: string, lastKey: IAttendanceKey | null): Promise<any> {
    try {
      return lastKey
        ? await this.model
            .query('groupKey')
            .eq(groupKey)
            .sort(SortOrder.descending)
            .startAt(lastKey)
            .limit(LIMIT)
            .exec()
        : await this.model
            .query('groupKey')
            .eq(groupKey)
            .sort(SortOrder.descending)
            .limit(LIMIT)
            .exec();
    } catch (error) {
      console.error(`[dynamodb] error`, error);
      throw new BadRequestException(error);
    }
  }

  async findById(key: IAttendanceKey): Promise<IAttendance> {
    try {
      return (await this.model.get(key)) as IAttendance;
    } catch (error) {
      console.error(`[dynamodb] error`, error);
      throw new BadRequestException(error);
    }
  }

  async update(
    key: IAttendanceKey,
    dto: UpdateAttendanceDto,
  ): Promise<IAttendance> {
    try {
      return (await this.model.update(key, {
        ...dto,
      })) as IAttendance;
    } catch (error) {
      console.error(`[dynamodb] error`, error);
      throw new BadRequestException(error);
    }
  }

  async markAsRead(key: IAttendanceKey): Promise<void> {
    try {
      await this.model.update(key, { isRead: true });
    } catch (error) {
      console.error('Error updating isRead:', error);
      throw error;
    }
  }

  async delete(key: IAttendanceKey): Promise<any> {
    try {
      return this.model.delete(key);
    } catch (error) {
      console.error(`[dynamodb] error`, error);
      throw new BadRequestException(error);
    }
  }
}
