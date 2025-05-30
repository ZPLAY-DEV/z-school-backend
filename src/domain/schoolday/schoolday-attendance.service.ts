import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { fromZonedTime } from 'date-fns-tz';
import { AttendanceStatus } from 'src/common/enums/attendance-status';
import {
  CreateAttendanceResultDto,
  CreateDynamoRecordWithDateDto,
  CreateDynamoRecordWithRangeDto,
} from 'src/domain/schoolday/dto/create-dynamo-record.dto';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import {
  ATTENDANCE_CONSTANTS,
  AttendanceItem,
  AttendanceRecordParams,
  DeleteRequest,
  WriteRequest,
} from 'src/domain/schoolday/types/attendance.types';
import {
  calculateTtl,
  formatToLocalDateString,
  generateDailyStudentKey,
  generateGroupKey,
  generateStudentId,
} from 'src/domain/schoolday/utils/attendance.utils';
import { DynamoService } from 'src/services/aws/dynamo.service';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';

const tableName = `${process.env.NODE_ENV}_attendance_table`;

@Injectable()
export class SchooldayAttendanceService {
  private readonly logger = new Logger(SchooldayAttendanceService.name);

  constructor(
    @InjectRepository(Schoolday)
    private readonly schooldayRepository: Repository<Schoolday>,
    private readonly dynamoService: DynamoService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create w/ date
  //? ---------------------------------------------------------------------- ?//

  async createWithDate(
    dto: CreateDynamoRecordWithDateDto,
  ): Promise<CreateAttendanceResultDto> {
    const { schoolId, termId, date } = dto;
    const startsAt = fromZonedTime(
      `${date}T00:00:00`,
      ATTENDANCE_CONSTANTS.TIME_ZONE,
    );
    const endsAt = fromZonedTime(
      `${date}T23:59:59`,
      ATTENDANCE_CONSTANTS.TIME_ZONE,
    );

    return await this.createAttendanceRecords(
      schoolId,
      termId,
      startsAt,
      endsAt,
    );
  }

  //? ---------------------------------------------------------------------- ?//
  //? Create w/ range
  //? ---------------------------------------------------------------------- ?//

  async createWithPeriod(
    dto: CreateDynamoRecordWithRangeDto,
  ): Promise<CreateAttendanceResultDto> {
    const { schoolId, termId, from, to } = dto;
    const startsAt = fromZonedTime(
      `${from}T00:00:00`,
      ATTENDANCE_CONSTANTS.TIME_ZONE,
    );
    const endsAt = fromZonedTime(
      `${to}T23:59:59`,
      ATTENDANCE_CONSTANTS.TIME_ZONE,
    );

    return await this.createAttendanceRecords(
      schoolId,
      termId,
      startsAt,
      endsAt,
    );
  }

  //? ---------------------------------------------------------------------- ?//
  //? Public batch operations for use by SchooldaySubscriber
  //? ---------------------------------------------------------------------- ?//

  /**
   * Public method for batch writing attendance items with retry logic
   * Used by SchooldaySubscriber for efficient batch operations
   */
  public async batchWriteAttendanceItems(
    items: (WriteRequest | DeleteRequest)[],
  ): Promise<CreateAttendanceResultDto> {
    let failedBatches = 0;

    for (let i = 0; i < items.length; i += ATTENDANCE_CONSTANTS.BATCH_SIZE) {
      const batch = items.slice(i, i + ATTENDANCE_CONSTANTS.BATCH_SIZE);
      let retries = 0;
      let unprocessed = batch;

      while (
        unprocessed.length > 0 &&
        retries < ATTENDANCE_CONSTANTS.MAX_RETRIES
      ) {
        try {
          const result = await this.dynamoService.send(
            new BatchWriteCommand({
              RequestItems: {
                [tableName]: unprocessed,
              },
            }),
          );
          const unprocessedItems = result.UnprocessedItems?.[tableName] ?? [];
          if (unprocessedItems.length > 0) {
            this.logger.warn(
              `BatchWriteCommand: ${unprocessedItems.length} unprocessed items, retrying... (attempt ${retries + 1})`,
            );
            unprocessed = unprocessedItems as typeof batch;
            retries++;
            await this.sleep(
              ATTENDANCE_CONSTANTS.BASE_DELAY * 2 ** (retries - 1),
            );
          } else {
            unprocessed = [];
          }
        } catch (err: any) {
          this.logger.error('BatchWriteCommand error', err);
          retries++;
          await this.sleep(
            ATTENDANCE_CONSTANTS.BASE_DELAY * 2 ** (retries - 1),
          );
        }
      }

      if (unprocessed.length > 0) {
        this.logger.error(
          `Failed to process ${unprocessed.length} items after ${ATTENDANCE_CONSTANTS.MAX_RETRIES} retries.`,
        );
        failedBatches++;
      }
    }

    return { total: items.length, failedBatches };
  }

  /**
   * Helper method to create delete requests for batch operations
   */
  public createDeleteRequests(
    groupKey: string,
    dailyStudentKeys: string[],
  ): DeleteRequest[] {
    return dailyStudentKeys.map((dailyStudentKey) => ({
      DeleteRequest: {
        Key: {
          groupKey,
          dailyStudentKey,
        },
      },
    }));
  }

  /**
   * Helper method to create put requests for batch operations
   */
  public createPutRequests(
    attendanceItems: AttendanceRecordParams[],
  ): WriteRequest[] {
    return attendanceItems.map((item) => ({
      PutRequest: {
        Item: this.buildAttendanceItem(item),
      },
    }));
  }

  /**
   * Builds DynamoDB item by filtering out undefined values (NoSQL best practice)
   */
  public buildAttendanceItem(item: AttendanceRecordParams): AttendanceItem {
    const result: Partial<AttendanceItem> = {};
    for (const [key, value] of Object.entries(item)) {
      if (value !== undefined) {
        result[key as keyof AttendanceItem] = value;
      }
    }
    return result as AttendanceItem;
  }

  // ------------------------------------------------------------------------ //
  // Private methods
  // ------------------------------------------------------------------------ //

  /**
   * Creates attendance records for schooldays within the given date range
   */
  private async createAttendanceRecords(
    schoolId: number | undefined,
    termId: number | undefined,
    startsAt: Date,
    endsAt: Date,
  ): Promise<CreateAttendanceResultDto> {
    // Build where condition dynamically based on provided parameters
    const whereCondition: any = {
      startsAt: MoreThanOrEqual(startsAt),
      endsAt: LessThanOrEqual(endsAt),
    };

    if (schoolId !== undefined) {
      whereCondition.schoolId = schoolId;
    }

    if (termId !== undefined) {
      whereCondition.termId = termId;
    }

    const schooldays = await this.schooldayRepository.find({
      where: whereCondition,
      relations: {
        group: {
          groupStudents: {
            student: true,
          },
          lesson: true,
        },
      },
    });

    const items: WriteRequest[] = [];
    const expires = calculateTtl(startsAt);

    for (const schoolday of schooldays) {
      const { group, startsAt, duration, lessonId, groupId } = schoolday;
      const { groupStudents: picks, groupName, lesson } = group;
      const localDate = formatToLocalDateString(startsAt);

      for (const pick of picks ?? []) {
        const groupKey = generateGroupKey(groupId);
        const dailyStudentKey = generateDailyStudentKey(
          localDate,
          pick.student.grade,
          pick.student.class,
          pick.student.studentCode,
        );
        const studentId = generateStudentId(
          pick.student.grade,
          pick.student.class,
          pick.student.studentCode,
        );

        if (
          pick.endedOn &&
          fromZonedTime(
            `${pick.endedOn}T23:59:59`,
            ATTENDANCE_CONSTANTS.TIME_ZONE,
          ) > startsAt
        ) {
          continue;
        }

        items.push({
          PutRequest: {
            Item: this.buildAttendanceItem({
              groupKey,
              dailyStudentKey,
              lessonId,
              lessonName: lesson?.lessonName ?? '과목',
              groupId,
              groupName: groupName ?? '반',
              studentId,
              studentName: pick.student.name ?? '학생',
              start: group.start,
              end: group.end,
              duration,
              status: AttendanceStatus.PENDING,
              expires,
            }),
          },
        });
      }
    }

    return await this.batchWriteAttendanceItems(items);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
