import { BadRequestException, Injectable } from '@nestjs/common';
import { SortOrder } from 'dynamoose/dist/General';
import { InjectModel, Model } from 'nestjs-dynamoose';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { UpsertAttendanceDto } from 'src/domain/attendance/dto/upsert-attendance.dto';
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
  //? This method works as upsert - if the item exists, it will be overwritten.
  //?
  async upsert(dto: UpsertAttendanceDto): Promise<IAttendance> {
    const { groupKey, dailyStudentKey, ...rest } = dto;
    const itemKey = {
      groupKey,
      dailyStudentKey,
    };
    const itemDto = {
      ...rest,
    };

    // intentionally using exception-driven control flow
    try {
      const result = await this.model.create({
        ...itemKey,
        ...itemDto,
      });
      console.log(
        '✅ created new attendance:',
        JSON.stringify(result, null, 2),
      );
      return result as unknown as IAttendance;
    } catch (error) {
      if (
        error.name === 'ConditionalCheckFailedException' ||
        error.code === 'ConditionalCheckFailedException'
      ) {
        try {
          const result = await this.model.update(itemKey, itemDto);
          console.log(
            '✅ updated existing attendance:',
            JSON.stringify(result, null, 2),
          );
          return result as unknown as IAttendance;
        } catch (updateError) {
          console.error(`[dynamodb] update error`, updateError);
          throw new BadRequestException(HttpErrorConstants.DYNAMO_UPDATE);
        }
      } else {
        console.error(`[dynamodb] error`, error);
        throw new BadRequestException(HttpErrorConstants.DYNAMO_CREATE);
      }
    }
  }

  //? notice that records will be sorted by range key,
  //? which is dailyStudentKey
  //?
  async fetch(
    groupKey: string,
    lastKey?: IAttendanceKey,
  ): Promise<{
    items: IAttendance[];
    count: number;
    lastKey?: IAttendanceKey;
  }> {
    try {
      const query = this.model
        .query('groupKey')
        .eq(groupKey)
        .sort(SortOrder.descending)
        .limit(LIMIT);

      const result = lastKey
        ? await query.startAt(lastKey).exec()
        : await query.exec();

      return {
        items: result as IAttendance[],
        count: result.count,
        lastKey: result.lastKey as IAttendanceKey | undefined,
      };
    } catch (error) {
      console.error(`[dynamodb] error`, error);
      throw new BadRequestException(HttpErrorConstants.DYNAMO_READ);
    }
  }

  async findById(dto: IAttendanceKey): Promise<IAttendance> {
    console.log(dto);
    try {
      return (await this.model.get(dto)) as IAttendance;
    } catch (error) {
      console.error(`[dynamodb] error`, error);
      throw new BadRequestException(HttpErrorConstants.DYNAMO_READ);
    }
  }

  async delete(dto: IAttendanceKey): Promise<void> {
    try {
      await this.model.delete(dto);
    } catch (error) {
      console.error(`[dynamodb] error`, error);
      throw new BadRequestException(HttpErrorConstants.DYNAMO_DELETE);
    }
  }
}
