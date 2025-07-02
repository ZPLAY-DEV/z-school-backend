import {
  DeleteCommand,
  PutCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { AttendanceStatus } from 'src/common/enums/attendance-status';
import {
  IAttendance,
  IAttendanceCore,
} from 'src/domain/attendance/entities/attendance.interface';
import {
  DeleteRequest,
  WriteRequest,
} from 'src/domain/attendance/types/attendance.types';
import {
  buildAttendanceItem,
  calculateTtl,
  generateDailyStudentKey,
  generateGroupKey,
} from 'src/domain/attendance/utils/attendance.utils';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import {
  BuildAttendanceBodyDto,
  CreateAttendanceForAllValidTermsDto,
  CreateDynamoRecordWithDateDto,
  CreateDynamoRecordWithRangeDto,
  DeleteAttendanceBySchoolTermDto,
  ResponseAttendanceDto,
} from 'src/domain/schoolday/dto/response-attendance.dto';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { chunk } from 'src/helpers/array';
import { getDateString } from 'src/helpers/date';
import { formatDateInKST } from 'src/helpers/time';
import { DynamoService } from 'src/services/aws/dynamo.service';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';

const ATTENDANCE_TABLE_NAME = `${process.env.NODE_ENV}_attendance_table`;

@Injectable()
export class SchooldayAttendanceService {
  private readonly logger = new Logger(SchooldayAttendanceService.name);

  constructor(
    @InjectRepository(Schoolday)
    private readonly schooldayRepository: Repository<Schoolday>,
    @InjectRepository(Term)
    private readonly termRepository: Repository<Term>,
    private readonly dynamoService: DynamoService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  async createWithDate(
    dto: CreateDynamoRecordWithDateDto,
  ): Promise<ResponseAttendanceDto> {
    const dateString = getDateString(dto.date);
    return this.createAttendances(dto.schoolId, dto.termId, dateString);
  }

  async createWithPeriod(
    dto: CreateDynamoRecordWithRangeDto,
  ): Promise<ResponseAttendanceDto> {
    return this.createAttendances(dto.schoolId, dto.termId, dto.from, dto.to);
  }

  async createAttendanceForAllValidTerms(
    dto: CreateAttendanceForAllValidTermsDto,
  ): Promise<ResponseAttendanceDto> {
    // 해당 날짜에 유효한 모든 학기 찾기
    const validTerms = await this.findTermsByDate(dto.date);

    if (validTerms.length === 0) {
      return { total: 0, failedBatches: 0, alreadyExists: 0 };
    }

    const allAttendances: IAttendance[] = [];

    for (const term of validTerms) {
      // 해당 학기의 해당 날짜에 있는 모든 수업일 찾기 (모든 lesson > group)
      const schooldays = await this.fetchSchooldaysByDate(
        term.schoolId,
        term.id,
        dto.date,
      );

      // 유효한 수업일들만 필터링
      const validSchooldays = schooldays.filter((schoolday) =>
        this.isValidSchooldayForAttendance(schoolday),
      );

      // 각 수업일에 대한 출석부 생성
      const termAttendances = this.buildAttendances(validSchooldays);
      allAttendances.push(...termAttendances);
    }

    const writeRequests = this.createPutRequestBatch(allAttendances);
    return this.executeBatchOperations(writeRequests);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  async deleteWithDate(
    dto: CreateDynamoRecordWithDateDto,
  ): Promise<ResponseAttendanceDto> {
    const dateString = getDateString(dto.date);
    return this.deleteAttendances(dto.schoolId, dto.termId, dateString);
  }

  async deleteWithPeriod(
    dto: CreateDynamoRecordWithRangeDto,
  ): Promise<ResponseAttendanceDto> {
    return this.deleteAttendances(dto.schoolId, dto.termId, dto.from, dto.to);
  }

  async deleteAttendancesBySchoolAndTerm(
    dto: DeleteAttendanceBySchoolTermDto,
  ): Promise<ResponseAttendanceDto> {
    // 해당 학교/학기의 모든 수업일 찾기 (날짜 범위 제한 없음)
    const schooldays = await this.fetchAllSchooldaysBySchoolAndTerm(
      dto.schoolId,
      dto.termId,
    );

    // 유효한 수업일들만 필터링
    const validSchooldays = schooldays.filter((schoolday) =>
      this.isValidSchooldayForAttendance(schoolday),
    );

    const deleteRequests = this.buildDeleteRequests(validSchooldays);
    return this.executeBatchOperations(deleteRequests);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Common Helper Methods (재활용성 향상)
  //? ---------------------------------------------------------------------- ?//

  /**
   * 공통 날짜 범위 파싱 로직
   */
  private parseDateRange(
    fromDate: string,
    toDate?: string,
  ): { startsAt: Date; endsAt: Date } {
    const startsAt = fromZonedTime(`${fromDate}T00:00:00`, 'Asia/Seoul');
    const endsAt = toDate
      ? fromZonedTime(`${toDate}T23:59:59`, 'Asia/Seoul')
      : fromZonedTime(`${fromDate}T23:59:59`, 'Asia/Seoul');

    return { startsAt, endsAt };
  }

  /**
   * 공통 schoolday 조회 및 검증 로직
   */
  private async getValidatedSchooldays(
    schoolId: number,
    termId: number,
    fromDate: string,
    toDate?: string,
  ): Promise<Schoolday[]> {
    const { startsAt, endsAt } = this.parseDateRange(fromDate, toDate);
    const schooldays = await this.fetchSchooldays(
      schoolId,
      termId,
      startsAt,
      endsAt,
    );

    return schooldays.filter((schoolday) =>
      this.isValidSchooldayForAttendance(schoolday),
    );
  }

  /**
   * Schoolday 유효성 검증 (타입 가드)
   */
  private isValidSchooldayForAttendance(schoolday: Schoolday): boolean {
    return !!(
      schoolday.group &&
      schoolday.group.picks &&
      schoolday.group.picks.length > 0
    );
  }

  //* ---------------------------------------------------------------------- *//
  //* BATCH OPERATIONS (Used by both subscriber and this service)
  //* ---------------------------------------------------------------------- *//

  /**
   * TransactWriteItems를 사용한 일괄 처리 (최대 100개)
   */
  async executeBatchOperations(
    items: (WriteRequest | DeleteRequest)[],
  ): Promise<ResponseAttendanceDto> {
    if (items.length === 0) {
      return { total: 0, failedBatches: 0, alreadyExists: 0 };
    }

    const chunks = chunk(items, 100);
    let totalAlreadyExists = 0;
    let totalFailedBatches = 0;

    for (const chunk of chunks) {
      const result = await this.executeTransactionChunk(chunk);
      totalAlreadyExists += result.alreadyExists;
      totalFailedBatches += result.failedBatches;
    }

    return {
      total: items.length,
      failedBatches: totalFailedBatches,
      alreadyExists: totalAlreadyExists,
    };
  }

  createDeleteRequestBatch(
    groupKey: string,
    dailyStudentKeys: string[],
  ): DeleteRequest[] {
    return dailyStudentKeys.map((dailyStudentKey) => ({
      DeleteRequest: { Key: { groupKey, dailyStudentKey } },
    }));
  }

  createPutRequestBatch(attendanceItems: IAttendanceCore[]): WriteRequest[] {
    return attendanceItems.map((item) => ({
      PutRequest: { Item: buildAttendanceItem(item) },
    }));
  }

  //? ---------------------------------------------------------------------- ?//
  //? DynamoDB create queries
  //? ---------------------------------------------------------------------- ?//

  private async createAttendances(
    schoolId: number,
    termId: number,
    fromDate: string,
    toDate?: string,
  ): Promise<ResponseAttendanceDto> {
    const schooldays = await this.getValidatedSchooldays(
      schoolId,
      termId,
      fromDate,
      toDate,
    );
    const attendances = this.buildAttendances(schooldays);
    const writeRequests = this.createPutRequestBatch(attendances);

    return this.executeBatchOperations(writeRequests);
  }

  private buildAttendances(schooldays: Schoolday[]): IAttendance[] {
    if (schooldays.length === 0) {
      return [];
    }

    const attendances: IAttendance[] = [];

    for (const schoolday of schooldays) {
      // getValidatedSchooldays에서 이미 검증되었으므로 안전함

      const { group, startsAt, duration, lessonId, groupId } = schoolday;
      const localDate = formatDateInKST(startsAt);
      const expires = calculateTtl(addDays(new Date(), 365));

      const dayAttendances = group.picks
        .filter(
          (pick) => pick.student && this.isStudentActiveOnDate(pick, startsAt),
        )
        .map((pick) =>
          this.buildAttendanceForStudent({
            pick,
            localDate,
            lessonId,
            lessonName: group.lesson?.lessonName || '',
            groupId,
            groupName: group.groupName,
            start: group.start,
            end: group.end,
            duration,
            expires,
          }),
        );

      attendances.push(...dayAttendances);
    }

    return attendances;
  }

  /**
   * 전학생 처리: start/end 기간 확인
   */
  private isStudentActiveOnDate(pick: Pick, date: Date): boolean {
    const hasStart = pick.start?.trim();
    const hasEnd = pick.end?.trim();

    if (!hasStart && !hasEnd) return true;

    try {
      const startDate = hasStart
        ? fromZonedTime(`${pick.start}T00:00:00`, 'Asia/Seoul')
        : null;
      const endDate = hasEnd
        ? fromZonedTime(`${pick.end}T23:59:59`, 'Asia/Seoul')
        : null;

      if (startDate && !endDate) return date >= startDate;
      if (!startDate && endDate) return date <= endDate;
      if (startDate && endDate) return date >= startDate && date <= endDate;

      return true;
    } catch (error) {
      this.logger.error('Date parsing error', { error, pickId: pick.id });
      return true;
    }
  }

  private buildAttendanceForStudent(dto: BuildAttendanceBodyDto): IAttendance {
    const groupKey = generateGroupKey(dto.groupId);
    const dailyStudentKey = generateDailyStudentKey(
      dto.localDate,
      dto.pick.student.id,
      dto.pick.student.grade,
      dto.pick.student.class,
      dto.pick.student.studentCode,
    );

    return {
      groupKey,
      dailyStudentKey,
      lessonId: dto.lessonId,
      lessonName: dto.lessonName,
      groupId: dto.groupId,
      groupName: dto.groupName,
      studentId: dto.pick.student.id,
      studentName: dto.pick.student.name,
      start: dto.start,
      end: dto.end,
      duration: dto.duration,
      status: AttendanceStatus.INIT,
      expires: dto.expires,
    };
  }

  private async executeTransactionChunk(
    items: (WriteRequest | DeleteRequest)[],
  ): Promise<{ alreadyExists: number; failedBatches: number }> {
    try {
      const transactItems = items.map((item) => {
        if ('PutRequest' in item) {
          return {
            Put: {
              TableName: ATTENDANCE_TABLE_NAME,
              Item: item.PutRequest.Item,
              ConditionExpression: 'attribute_not_exists(groupKey)',
            },
          };
        } else {
          return {
            Delete: {
              TableName: ATTENDANCE_TABLE_NAME,
              Key: item.DeleteRequest.Key,
            },
          };
        }
      });

      await this.dynamoService.send(
        new TransactWriteCommand({ TransactItems: transactItems }),
      );
      return { alreadyExists: 0, failedBatches: 0 };
    } catch (error) {
      if (error.name === 'TransactionCanceledException') {
        return this.fallbackToIndividualProcessing(items);
      }

      this.logger.error('Transaction failed', error);
      return { alreadyExists: 0, failedBatches: items.length };
    }
  }

  private async fallbackToIndividualProcessing(
    items: (WriteRequest | DeleteRequest)[],
  ): Promise<{ alreadyExists: number; failedBatches: number }> {
    let alreadyExists = 0;
    let failedBatches = 0;

    for (const item of items) {
      try {
        if ('PutRequest' in item) {
          await this.dynamoService.send(
            new PutCommand({
              TableName: ATTENDANCE_TABLE_NAME,
              Item: item.PutRequest.Item,
              ConditionExpression:
                'attribute_not_exists(groupKey) AND attribute_not_exists(dailyStudentKey)',
            }),
          );
        } else {
          await this.dynamoService.send(
            new DeleteCommand({
              TableName: ATTENDANCE_TABLE_NAME,
              Key: item.DeleteRequest.Key,
            }),
          );
        }
      } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
          alreadyExists++;
        } else {
          this.logger.error('DynamoDB operation failed', error);
          failedBatches++;
        }
      }
    }

    return { alreadyExists, failedBatches };
  }

  //? ---------------------------------------------------------------------- ?//
  //? DynamoDB delete queries
  //? ---------------------------------------------------------------------- ?//

  private async deleteAttendances(
    schoolId: number,
    termId: number,
    fromDate: string,
    toDate?: string,
  ): Promise<ResponseAttendanceDto> {
    const schooldays = await this.getValidatedSchooldays(
      schoolId,
      termId,
      fromDate,
      toDate,
    );
    const deleteRequests = this.buildDeleteRequests(schooldays);

    return this.executeBatchOperations(deleteRequests);
  }

  private buildDeleteRequests(schooldays: Schoolday[]): DeleteRequest[] {
    if (schooldays.length === 0) {
      return [];
    }

    const deleteRequests: DeleteRequest[] = [];

    for (const schoolday of schooldays) {
      // getValidatedSchooldays에서 이미 검증되었으므로 안전함

      const { group, startsAt, groupId } = schoolday;
      const localDate = formatDateInKST(startsAt);
      const groupKey = generateGroupKey(groupId);

      const dailyStudentKeys = group.picks
        .filter(
          (pick) => pick.student && this.isStudentActiveOnDate(pick, startsAt),
        )
        .map((pick) =>
          generateDailyStudentKey(
            localDate,
            pick.student.id,
            pick.student.grade,
            pick.student.class,
            pick.student.studentCode,
          ),
        );

      const dayDeleteRequests = this.createDeleteRequestBatch(
        groupKey,
        dailyStudentKeys,
      );

      deleteRequests.push(...dayDeleteRequests);
    }

    return deleteRequests;
  }

  //? ---------------------------------------------------------------------- ?//
  //? MySQL queries
  //? ---------------------------------------------------------------------- ?//

  private async fetchSchooldays(
    schoolId: number,
    termId: number,
    startsAt: Date,
    endsAt: Date,
  ): Promise<Schoolday[]> {
    return this.schooldayRepository.find({
      where: {
        schoolId,
        termId,
        startsAt: MoreThanOrEqual(startsAt),
        endsAt: LessThanOrEqual(endsAt),
      },
      relations: {
        group: {
          picks: { student: true },
          lesson: true,
        },
      },
    });
  }

  private async findTermsByDate(dateString: string): Promise<Term[]> {
    return this.termRepository.find({
      where: {
        start: LessThanOrEqual(dateString),
        end: MoreThanOrEqual(dateString),
      },
    });
  }

  /**
   * 특정 날짜에 해당하는 수업일들을 조회 (모든 lesson > group)
   */
  private async fetchSchooldaysByDate(
    schoolId: number,
    termId: number,
    targetDate: string,
  ): Promise<Schoolday[]> {
    const { startsAt, endsAt } = this.parseDateRange(targetDate);

    return this.schooldayRepository.find({
      where: {
        schoolId,
        termId,
        startsAt: MoreThanOrEqual(startsAt),
        endsAt: LessThanOrEqual(endsAt),
      },
      relations: {
        group: {
          picks: { student: true },
          lesson: true,
        },
      },
    });
  }

  /**
   * 특정 학교/학기의 모든 수업일들을 조회 (날짜 제한 없음)
   */
  private async fetchAllSchooldaysBySchoolAndTerm(
    schoolId: number,
    termId: number,
  ): Promise<Schoolday[]> {
    return this.schooldayRepository.find({
      where: {
        schoolId,
        termId,
      },
      relations: {
        group: {
          picks: { student: true },
          lesson: true,
        },
      },
    });
  }
}
