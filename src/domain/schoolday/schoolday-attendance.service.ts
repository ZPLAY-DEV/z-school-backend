import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { format } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { AttendanceStatus } from 'src/common/enums/attendance-status';
import {
  CreateDynamoRecordWithDateDto,
  CreateDynamoRecordWithRangeDto,
} from 'src/domain/schoolday/dto/create-dynamo-record.dto';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { getDigitStudentId, getStudentId } from 'src/helpers/student';
import { DynamoService } from 'src/services/aws/dynamo.service';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
const BATCH_SIZE = 25;
const MAX_RETRIES = 5;
const BASE_DELAY = 100; // ms
const timeZone = 'Asia/Seoul';
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

  //! date from db is zulu time (UTC)
  //! local time is korea time (Asia/Seoul)
  //! Date() returns korea time (Asia/Seoul)
  //! fromZonedTime() returns zulu time (UTC)

  async createWithDate(dto: CreateDynamoRecordWithDateDto): Promise<any> {
    const { schoolId, termId, date } = dto;
    const startsAt = fromZonedTime(`${date}T00:00:00`, timeZone);
    const endsAt = fromZonedTime(`${date}T23:59:59`, timeZone);

    const schooldays = await this.schooldayRepository.find({
      where: {
        schoolId,
        termId,
        startsAt: MoreThanOrEqual(startsAt),
        endsAt: LessThanOrEqual(endsAt),
      },
      relations: {
        group: {
          groupStudents: {
            student: true,
          },
          lesson: true,
        },
      },
    });

    type WriteRequest = { PutRequest: { Item: Record<string, any> } };
    const items: WriteRequest[] = [];

    const expires =
      Math.floor(new Date(startsAt).getTime() / 1000) + 60 * 60 * 24 * 365;

    for (const schoolday of schooldays) {
      const { group, startsAt, duration, lessonId, groupId } = schoolday;
      const { groupStudents: picks, groupName, lesson } = group;
      const localDate = format(
        toZonedTime(startsAt, 'Asia/Seoul'),
        'yyyy-MM-dd',
      );
      for (const pick of picks ?? []) {
        const groupKey = `GROUP#${groupId}`;
        const digitStudentId = getDigitStudentId(
          pick.student.grade,
          pick.student.class,
          pick.student.studentCode,
        );
        const studentId = getStudentId(
          pick.student.grade,
          pick.student.class,
          pick.student.studentCode,
        );
        const dailyStudentKey = `DATE#${localDate}#STUDENT#${digitStudentId}`;

        if (
          pick.endedOn &&
          fromZonedTime(`${pick.endedOn}T23:59:59`, timeZone) > startsAt
        ) {
          continue;
        }

        items.push({
          PutRequest: {
            Item: {
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
            },
          },
        });
      }
    }

    let failedBatches = 0;
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch: WriteRequest[] = items.slice(i, i + BATCH_SIZE);
      let retries = 0;
      let unprocessed = batch;
      while (unprocessed.length > 0 && retries < MAX_RETRIES) {
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
            unprocessed = unprocessedItems as WriteRequest[];
            retries++;
            await this.sleep(BASE_DELAY * 2 ** (retries - 1));
          } else {
            unprocessed = [];
          }
        } catch (err: any) {
          this.logger.error('BatchWriteCommand error', err);
          retries++;
          await this.sleep(BASE_DELAY * 2 ** (retries - 1));
        }
      }
      if (unprocessed.length > 0) {
        this.logger.error(
          `Failed to process ${unprocessed.length} items after ${MAX_RETRIES} retries.`,
        );
        failedBatches++;
      }
    }
    return { total: items.length, failedBatches };
  }

  //? ---------------------------------------------------------------------- ?//
  //? Create w/ range
  //? ---------------------------------------------------------------------- ?//

  async createWithRange(dto: CreateDynamoRecordWithRangeDto): Promise<any> {
    const { schoolId, termId, from, to } = dto;
    const startsAt = fromZonedTime(`${from}T00:00:00`, timeZone);
    const endsAt = fromZonedTime(`${to}T23:59:59`, timeZone);

    const schooldays = await this.schooldayRepository.find({
      where: {
        schoolId,
        termId,
        startsAt: MoreThanOrEqual(startsAt),
        endsAt: LessThanOrEqual(endsAt),
      },
      relations: {
        group: {
          groupStudents: {
            student: true,
          },
          lesson: true,
        },
      },
    });

    type WriteRequest = { PutRequest: { Item: Record<string, any> } };
    const items: WriteRequest[] = [];

    const expires =
      Math.floor(new Date(startsAt).getTime() / 1000) + 60 * 60 * 24 * 365;

    for (const schoolday of schooldays) {
      const { group, startsAt, duration, lessonId, groupId } = schoolday;
      const { groupStudents: picks, groupName, lesson } = group;
      const localDate = format(
        toZonedTime(startsAt, 'Asia/Seoul'),
        'yyyy-MM-dd',
      );
      for (const pick of picks ?? []) {
        const groupKey = `GROUP#${groupId}`;
        const digitStudentId = getDigitStudentId(
          pick.student.grade,
          pick.student.class,
          pick.student.studentCode,
        );
        const studentId = getStudentId(
          pick.student.grade,
          pick.student.class,
          pick.student.studentCode,
        );
        const dailyStudentKey = `DATE#${localDate}#STUDENT#${digitStudentId}`;

        if (
          pick.endedOn &&
          fromZonedTime(`${pick.endedOn}T23:59:59`, timeZone) > startsAt
        ) {
          continue;
        }

        items.push({
          PutRequest: {
            Item: {
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
            },
          },
        });
      }
    }

    let failedBatches = 0;
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch: WriteRequest[] = items.slice(i, i + BATCH_SIZE);
      let retries = 0;
      let unprocessed = batch;
      while (unprocessed.length > 0 && retries < MAX_RETRIES) {
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
            unprocessed = unprocessedItems as WriteRequest[];
            retries++;
            await this.sleep(BASE_DELAY * 2 ** (retries - 1));
          } else {
            unprocessed = [];
          }
        } catch (err: any) {
          this.logger.error('BatchWriteCommand error', err);
          retries++;
          await this.sleep(BASE_DELAY * 2 ** (retries - 1));
        }
      }
      if (unprocessed.length > 0) {
        this.logger.error(
          `Failed to process ${unprocessed.length} items after ${MAX_RETRIES} retries.`,
        );
        failedBatches++;
      }
    }
    return { total: items.length, failedBatches };
  }

  // ------------------------------------------------------------------------ //
  // Private methods
  // ------------------------------------------------------------------------ //

  private sleep(ms: number) {
    // Exponential backoff sleep helper
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
