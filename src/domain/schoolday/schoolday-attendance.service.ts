import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { AttendanceStatus } from 'src/common/enums/attendance-status';
import { AttendanceService } from 'src/domain/attendance/attendance.service';
import { CreateSchooldayAttendanceDto } from 'src/domain/schoolday/dto/create-schoolday-attendance.dto';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { getDigitStudentId, getStudentId } from 'src/helpers/student';
import { DynamoService } from 'src/services/aws/dynamo.service';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';

@Injectable()
export class SchooldayAttendanceService {
  private readonly logger = new Logger(SchooldayAttendanceService.name);

  constructor(
    @InjectRepository(Schoolday)
    private readonly schooldayRepository: Repository<Schoolday>,
    private readonly attendanceService: AttendanceService,
    private readonly dynamoService: DynamoService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateSchooldayAttendanceDto): Promise<any> {
    const { schoolId, termId, from, to } = dto;
    const startsAt = new Date(from);
    const endsAt = new Date(to);
    console.log(`startsAt =`, startsAt);
    console.log(`endsAt =`, endsAt);
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

    await Promise.all(
      schooldays.map(async (schoolday) => {
        const { group, startsAt, duration, lessonId, groupId } = schoolday;
        const { groupStudents, groupName, lesson } = group;
        const localDate = format(
          toZonedTime(startsAt, 'Asia/Seoul'),
          'yyyy-MM-dd',
        );
        for (const { student } of groupStudents ?? []) {
          const groupKey = `GROUP#${groupId}`;
          const dailyStudentKey = `DATE#${localDate}#STUDENT#${student.id}`;
          const studentId = getStudentId(
            student.grade,
            student.class,
            student.studentCode,
          );
          await this.attendanceService.create({
            groupKey,
            dailyStudentKey,
            lessonId,
            lessonName: lesson?.lessonName ?? '과목',
            groupId,
            groupName: groupName ?? '반',
            studentId,
            studentName: student.name ?? '학생',
            start: group.start,
            end: group.end,
            duration,
            status: AttendanceStatus.PRESENT, // 기본값, 필요시 변경
          });
        }
      }),
    );

    return schooldays;
  }

  // Exponential backoff sleep helper
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async create2(dto: CreateSchooldayAttendanceDto): Promise<any> {
    const { schoolId, termId, from, to } = dto;
    const startsAt = new Date(from);
    const endsAt = new Date(to);
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
      const { groupStudents, groupName, lesson } = group;
      const localDate = format(
        toZonedTime(startsAt, 'Asia/Seoul'),
        'yyyy-MM-dd',
      );
      for (const { student } of groupStudents ?? []) {
        const groupKey = `GROUP#${groupId}`;
        const digitStudentId = getDigitStudentId(
          student.grade,
          student.class,
          student.studentCode,
        );
        const studentId = getStudentId(
          student.grade,
          student.class,
          student.studentCode,
        );
        const dailyStudentKey = `DATE#${localDate}#STUDENT#${digitStudentId}`;
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
              studentName: student.name ?? '학생',
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

    const BATCH_SIZE = 25;
    const MAX_RETRIES = 5;
    const BASE_DELAY = 100; // ms
    let failedBatches = 0;
    const tableName = 'development_attendance_table';
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
}
