import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { SortOrder } from 'dynamoose/dist/General';
import { InjectModel, Model } from 'nestjs-dynamoose';
import { AttendanceStatus } from 'src/common/enums';
import {
  CreateAttendanceWithStudentSchooldayDto,
  UpsertAttendanceDto,
} from 'src/domain/attendance/dto/upsert-attendance.dto';
import {
  IAttendance,
  IAttendanceKey,
} from 'src/domain/attendance/entities/attendance.interface';
import {
  generateDailyStudentKey,
  generateGroupKey,
} from 'src/domain/attendance/utils/attendance.utils';
import { Group } from 'src/domain/group/entities/group.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { Repository } from 'typeorm';

const LIMIT = 10;

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel('Attendance')
    private readonly model: Model<IAttendance, IAttendanceKey>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Schoolday)
    private readonly schooldayRepository: Repository<Schoolday>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {}

  async init(): Promise<void> {
    const now = addDays(new Date(), 1);
    const ttl = Math.floor(now.getTime() / 1000); // 1일

    const itemKey = {
      groupKey: generateGroupKey(1),
      dailyStudentKey: generateDailyStudentKey('2025-01-01', 1, 1, '1', 1),
    };

    const itemDto = {
      lessonId: 1,
      lessonName: '수학',
      groupId: 1,
      groupName: '1학년1반',
      studentId: 1,
      studentName: '김철수',
      start: '14:00',
      end: '15:00',
      duration: 60,
      status: AttendanceStatus.INIT,
      expires: ttl,
    };

    try {
      // update() 메서드를 사용하여 upsert 효과 구현
      await this.model.update(itemKey, itemDto);
      console.log('✅ created/updated attendance record in init()');
    } catch (error) {
      console.error(`🚨`, error);
    }
  }

  //? notice that even if you provide createdAt and updatedAt in the payload
  //? dynamodb will ignore them and record the timestamps with its own value.
  //? This method works as upsert - if the item exists, it will be overwritten.
  //?
  async upsertWithStudentAndSchoolday(
    dto: CreateAttendanceWithStudentSchooldayDto,
  ): Promise<IAttendance> {
    const { studentId, schooldayId, status, parentNote, schoolNote } = dto;

    const student = await this.studentRepository.findOne({
      where: {
        id: studentId,
      },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    const schoolday = await this.schooldayRepository.findOne({
      where: {
        id: schooldayId,
      },
      relations: ['group', 'group.lesson'],
    });
    if (!schoolday) {
      throw new NotFoundException('Schoolday not found');
    }
    const expires = Math.floor(
      addDays(schoolday.startsAt, 400).getTime() / 1000,
    );
    const itemKey = {
      groupKey: generateGroupKey(schoolday.group.id),
      dailyStudentKey: generateDailyStudentKey(
        formatInTimeZone(schoolday.startsAt, 'Asia/Seoul', 'yyyy-MM-dd'),
        student.id,
        student.grade,
        student.class,
        student.studentCode,
      ),
    };
    const itemDto = {
      lessonId: schoolday.group.lesson.id,
      lessonName: schoolday.group.lesson.lessonName,
      groupId: schoolday.group.id,
      groupName: schoolday.group.groupName,
      studentId: student.id,
      studentName: student.name,
      start: formatInTimeZone(schoolday.startsAt, 'Asia/Seoul', 'HH:mm'),
      end: formatInTimeZone(schoolday.endsAt, 'Asia/Seoul', 'HH:mm'),
      duration: schoolday.duration,
      ...(status && { status }),
      ...(parentNote && { parentNote }),
      ...(schoolNote && { schoolNote }),
      expires,
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
          throw new BadRequestException(updateError.message);
        }
      } else {
        console.error(`[dynamodb] error`, error);
        throw new BadRequestException(error.message);
      }
    }
  }

  // async notify(dto: NotifyParentsParams): Promise<any> {}

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
    const date = dailyStudentKey.split('#')[1];
    const group = await this.groupRepository.findOne({
      where: {
        id: rest.groupId!,
      },
      relations: ['schooldays'],
    });

    const schoolday = group?.schooldays.find(
      (v) => formatInTimeZone(v.startsAt, 'Asia/Seoul', 'yyyy-MM-dd') === date,
    );
    if (!schoolday) {
      throw new NotFoundException('Schoolday not found');
    }
    const expires = Math.floor(
      addDays(schoolday.startsAt, 400).getTime() / 1000,
    );

    itemDto.start = formatInTimeZone(schoolday.startsAt, 'Asia/Seoul', 'HH:mm');
    itemDto.end = formatInTimeZone(schoolday.endsAt, 'Asia/Seoul', 'HH:mm');
    itemDto.duration = schoolday.duration;
    itemDto.expires = expires;

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
          throw new BadRequestException(updateError.message);
        }
      } else {
        console.error(`[dynamodb] error`, error);
        throw new BadRequestException(error.message);
      }
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

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
      throw new BadRequestException(error.message);
    }
  }

  async findById(dto: IAttendanceKey): Promise<IAttendance> {
    console.log(dto);
    try {
      return (await this.model.get(dto)) as IAttendance;
    } catch (error) {
      console.error(`[dynamodb] error`, error);
      throw new BadRequestException(error.message);
    }
  }

  async delete(dto: IAttendanceKey): Promise<void> {
    try {
      await this.model.delete(dto);
    } catch (error) {
      console.error(`[dynamodb] error`, error);
      throw new BadRequestException(error.message);
    }
  }
}
