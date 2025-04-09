import { BadRequestException, Injectable } from '@nestjs/common';
import { addDays } from 'date-fns';
import { SortOrder } from 'dynamoose/dist/General';
import { InjectModel, Model } from 'nestjs-dynamoose';
import { UpdateAlarmDto } from 'src/domain/alarm/dto/update-alarm.dto';
import { IAlarm, IAlarmKey } from 'src/domain/alarm/entities/alarm.interface';
import { CreateAlarmDto } from './dto/create-alarm.dto';

const LIMIT = 10;

@Injectable()
export class AlarmService {
  constructor(
    @InjectModel('Alarm')
    private readonly model: Model<IAlarm, IAlarmKey>,
  ) {}

  //? notice that even if you provide createdAt and updatedAt in the payload
  //? dynamodb will ignore them and record the timestamps with its own value.
  //?
  async create(dto: CreateAlarmDto): Promise<IAlarm> {
    const timestampInMilliseconds = new Date().getTime();
    const id = `m${timestampInMilliseconds}`; // m as in message
    //! as for the expiration, needs to be in seconds format (not milliseconds)
    const expires = Math.floor(addDays(new Date(), 7).getTime() / 1000);
    try {
      const alarm = await this.model.create({
        ...dto,
        id,
        expires,
        data: dto.data || {},
      });
      return alarm;
    } catch (error) {
      console.error(`[dynamodb] error`, error);
      throw new BadRequestException(error);
    }
  }

  //? notice that records will be sorted by range key, which is id
  //? (in m## format string; xx is milliseconds).
  //?
  async fetch(userId: number, lastKey: IAlarmKey | null): Promise<any> {
    try {
      return lastKey
        ? await this.model
            .query('userId')
            .eq(userId)
            .sort(SortOrder.descending)
            .startAt(lastKey)
            .limit(LIMIT)
            .exec()
        : await this.model
            .query('userId')
            .eq(userId)
            .sort(SortOrder.descending)
            .limit(LIMIT)
            .exec();
    } catch (error) {
      console.error(`[dynamodb] error`, error);
      throw new BadRequestException(error);
    }
  }

  async findById(key: IAlarmKey): Promise<IAlarm> {
    try {
      return this.model.get(key);
    } catch (error) {
      console.error(`[dynamodb] error`, error);
      throw new BadRequestException(error);
    }
  }

  async update(key: IAlarmKey, dto: UpdateAlarmDto): Promise<IAlarm> {
    try {
      return this.model.update(key, {
        ...dto,
        data: dto.data || {},
      });
    } catch (error) {
      console.error(`[dynamodb] error`, error);
      throw new BadRequestException(error);
    }
  }

  async markAsRead(userId: number, id: string): Promise<void> {
    try {
      await this.model.update({ userId, id }, { isRead: true });
    } catch (error) {
      console.error('Error updating isRead:', error);
      throw error;
    }
  }

  async delete(key: IAlarmKey): Promise<any> {
    try {
      return this.model.delete(key);
    } catch (error) {
      console.error(`[dynamodb] error`, error);
      throw new BadRequestException(error);
    }
  }
}
