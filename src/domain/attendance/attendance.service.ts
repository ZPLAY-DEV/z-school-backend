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
import { UpsertAttendanceDto } from 'src/domain/attendance/dto/upsert-attendance.dto';
import {
  IAttendance,
  IAttendanceKey,
} from 'src/domain/attendance/entities/attendance.interface';
import {
  generateDailyStudentKey,
  generateGroupKey,
  getDateFromDailyStudentKey,
  getGroupIdFromGroupKey,
  getStudentIdFromDailyStudentKey,
} from 'src/domain/attendance/utils/attendance.utils';
import { Group } from 'src/domain/group/entities/group.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { Repository } from 'typeorm';

const LIMIT = 20;

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

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  async init(): Promise<void> {
    console.log('🚀 Starting init() function...');

    try {
      console.log('📋 Checking model injection...');
      console.log('Model type:', typeof this.model);
      console.log(
        'Model methods:',
        Object.getOwnPropertyNames(Object.getPrototypeOf(this.model)),
      );

      const now = addDays(new Date(), 1);
      const ttl = Math.floor(now.getTime() / 1000); // 1일

      const itemKey = {
        groupKey: generateGroupKey(80),
        dailyStudentKey: generateDailyStudentKey('2025-07-22', 1, 1, '1', 1),
      };

      const itemDto = {
        lessonName: '바이올린',
        groupId: 80,
        studentId: 1,
        studentName: '편도율',
        start: '13:50',
        end: '14:30',
        weekday: '월',
        status: AttendanceStatus.EXCUSED_ABSENT,
        parentNote: '코로나 때문에 빠집니다.',
        expires: ttl,
      };

      console.log('🔑 Generated itemKey:', JSON.stringify(itemKey, null, 2));
      console.log('📝 Generated itemDto:', JSON.stringify(itemDto, null, 2));
      console.log('🔄 Attempting to call model.update()...');

      // update() 메서드를 사용하여 upsert 효과 구현
      const result = await this.model.update(itemKey, itemDto);
      console.log(
        '✅ Successfully created/updated attendance record in init()',
      );
      console.log('📊 Result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('🚨 Error in init() function:');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error stack:', error.stack);
      console.error('Full error object:', JSON.stringify(error, null, 2));

      // Dynamoose 관련 추가 정보
      if (error.$metadata) {
        console.error(
          'AWS Metadata:',
          JSON.stringify(error.$metadata, null, 2),
        );
      }
      if (error.__type) {
        console.error('AWS Error Type:', error.__type);
      }

      throw error; // 에러를 다시 던져서 애플리케이션 시작을 중단시킴
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  //? notice that records will be sorted by range key,
  //? which is dailyStudentKey
  //?
  async fetch(
    groupKey: string,
    lastKey?: IAttendanceKey,
    count?: number,
  ): Promise<{
    items: IAttendance[];
    count: number;
    lastKey?: IAttendanceKey;
  }> {
    try {
      const limit = count && count > 0 ? count : LIMIT;
      const query = this.model
        .query('groupKey')
        .eq(groupKey)
        .sort(SortOrder.descending)
        .limit(limit);

      const result = lastKey
        ? await query.startAt(lastKey).exec()
        : await query.exec();

      return {
        items: result as IAttendance[],
        count: result.count,
        lastKey: result.lastKey as IAttendanceKey | undefined,
      };
    } catch (error) {
      console.error(`[dynamodb] fetch error:`, error);
      throw new BadRequestException(error.message);
    }
  }

  //? Scan all attendance records across all groups
  //? Used when no specific groupId is provided
  //?
  async scanAll(
    lastKey?: IAttendanceKey,
    count?: number,
  ): Promise<{
    items: IAttendance[];
    count: number;
    lastKey?: IAttendanceKey;
  }> {
    try {
      const limit = count && count > 0 ? count : LIMIT;
      const scanQuery = this.model.scan().limit(limit);

      const result = lastKey
        ? await scanQuery.startAt(lastKey).exec()
        : await scanQuery.exec();

      return {
        items: result as IAttendance[],
        count: result.count,
        lastKey: result.lastKey as IAttendanceKey | undefined,
      };
    } catch (error) {
      console.error(`[dynamodb] scan error:`, error);
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

  /**
   * Fetch attendance records by groupId and comma separated rangeKeys
   * @param groupId - Group ID to generate partition key
   * @param rangeKeys - Comma separated rangeKeys string
   * @returns Array of attendance records
   */
  async fetchByKeys(
    groupId: number,
    rangeKeys: string[],
  ): Promise<IAttendance[]> {
    try {
      const groupKey = generateGroupKey(groupId);

      if (rangeKeys.length === 0) {
        return [];
      }

      const results: IAttendance[] = [];

      // DynamoDB batchGet을 사용하여 여러 키를 한 번에 조회
      const keys = rangeKeys.map((dailyStudentKey) => ({
        groupKey,
        dailyStudentKey,
      }));

      const batchResults = await this.model.batchGet(keys);

      // batchGet 결과에서 유효한 아이템들만 필터링
      for (const item of batchResults) {
        if (item) {
          results.push(item as IAttendance);
        }
      }

      return results;
    } catch (error) {
      console.error(`[dynamodb] fetchByKeys error:`, error);
      throw new BadRequestException(error.message);
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  async upsert(dto: UpsertAttendanceDto): Promise<IAttendance> {
    const { groupKey, dailyStudentKey, ...rest } = dto;
    const itemKey = { groupKey, dailyStudentKey };

    const groupId = getGroupIdFromGroupKey(groupKey);
    const date = getDateFromDailyStudentKey(dailyStudentKey);

    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['schooldays', 'lesson', 'picks', 'picks.student'],
    });
    if (!group) throw new NotFoundException('Group not found');

    const schoolday = group.schooldays.find(
      (v) => formatInTimeZone(v.startsAt, 'Asia/Seoul', 'yyyy-MM-dd') === date,
    );
    if (!schoolday) throw new NotFoundException('Schoolday not found');

    const pick = group.picks.find(
      (v) => v.student.id === getStudentIdFromDailyStudentKey(dailyStudentKey),
    );
    if (!pick?.student) throw new NotFoundException('Student not found');

    const expires = Math.floor(
      addDays(schoolday.startsAt, 400).getTime() / 1000,
    );

    // 기존 항목 조회
    let existing: IAttendance | null = null;
    try {
      existing = await this.model.get(itemKey);
    } catch (err) {
      console.warn(`[dynamoose] get 실패:`, err);
      existing = null;
    }

    const newData = {
      ...rest,
      lessonId: group.lesson.id,
      lessonName: group.lesson.lessonName,
      groupId: group.id,
      groupName: group.groupName,
      studentId: pick.student.id,
      studentName: pick.student.name,
      start: formatInTimeZone(schoolday.startsAt, 'Asia/Seoul', 'HH:mm'),
      end: formatInTimeZone(schoolday.endsAt, 'Asia/Seoul', 'HH:mm'),
      weekday: group.weekday,
      expires,
    };

    if (
      rest.parentNote !== undefined &&
      rest.parentNote !== existing?.parentNote
    ) {
      newData.parentNotedAt = new Date();
    }

    if (
      rest.schoolNote !== undefined &&
      rest.schoolNote !== existing?.schoolNote
    ) {
      newData.schoolNotedAt = new Date();
    }

    try {
      let result: IAttendance;

      if (existing) {
        // ✅ 존재하면 update (부분 갱신)
        result = await this.model.update(itemKey, newData);
      } else {
        // ✅ 없으면 create (완전 생성)
        result = await this.model.create({
          ...itemKey,
          ...newData,
        });
      }

      return result;
    } catch (err) {
      console.error(`[dynamoose v4] upsert error`, err);
      throw new BadRequestException(err.message);
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  async delete(dto: IAttendanceKey): Promise<void> {
    try {
      await this.model.delete(dto);
    } catch (error) {
      console.error(`[dynamodb] error`, error);
      throw new BadRequestException(error.message);
    }
  }
}
