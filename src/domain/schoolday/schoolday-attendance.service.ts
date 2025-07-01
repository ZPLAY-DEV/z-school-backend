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
  CreateDynamoRecordWithDateDto,
  CreateDynamoRecordWithRangeDto,
  ResponseAttendanceDto,
} from 'src/domain/schoolday/dto/response-attendance.dto';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { chunk } from 'src/helpers/array';
import { formatDateInKST } from 'src/helpers/time';
import { DynamoService } from 'src/services/aws/dynamo.service';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';

const ATTENDANCE_TABLE_NAME = `${process.env.NODE_ENV}_attendance_table`;

/**
 * 수업일 출석부 관리 서비스
 * 출석부 생성, 일괄 처리, DynamoDB 연동을 담당합니다
 */
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

  //* ----------------------------------------------------------------------- */
  //* PUBLIC API METHODS
  //* ----------------------------------------------------------------------- */

  /**
   * 특정 날짜의 수업일 출석부를 생성합니다
   * @param date `2025-08-14` 형식의 날짜 문자열
   * @returns 생성된 총 기록 수, 실패 수, 이미 존재하는 기록 수를 반환
   */
  async createAllWithDate(param?: string): Promise<ResponseAttendanceDto[]> {
    const date = !param ? new Date() : new Date(param);
    const dateString = date.toISOString().split('T')[0];

    const terms = await this.findTermsByDate(dateString);
    const results: ResponseAttendanceDto[] = [];

    for (const term of terms) {
      const result = await this.createAttendancesForTerm(term, dateString);
      results.push(result);
    }

    return results;
  }

  async createWithDate(
    dto: CreateDynamoRecordWithDateDto,
  ): Promise<ResponseAttendanceDto> {
    const dateString = this.getDateString(dto.date);
    return this.createAttendances(
      dto.schoolId,
      dto.termId,
      dateString,
      dateString,
    );
  }

  /**
   * 기간 내 수업일 출석부를 일괄 생성합니다
   * @param dto - 학교ID, 학기ID, 시작날짜, 종료날짜가 포함된 데이터
   * @returns 생성된 총 기록 수, 실패 수, 이미 존재하는 기록 수를 반환
   */
  async createWithPeriod(
    dto: CreateDynamoRecordWithRangeDto,
  ): Promise<ResponseAttendanceDto> {
    return this.createAttendances(dto.schoolId, dto.termId, dto.from, dto.to);
  }

  //* ----------------------------------------------------------------------- */
  //* BATCH OPERATIONS (Used by SchooldaySubscriber)
  //* ----------------------------------------------------------------------- */

  /**
   * 출석부 아이템들을 조건부 로직과 함께 일괄 처리합니다
   * ✅ TransactWriteItems 사용으로 최적화:
   * - 속도: 빠름 (최대 100개 아이템을 1회 API 콜로 처리)
   * - 정확도: 높음 (ConditionExpression 완전 지원)
   * - 비용: 2x WCU (일반 write 대비)
   * @param items - 생성 또는 삭제 요청 배열 (최대 100개)
   * @returns 실패 건수와 조건 체크 실패 건수를 포함한 결과 요약
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

  /**
   * 일괄 처리용 삭제 요청 객체들을 생성합니다
   * @param groupKey - 그룹 식별자
   * @param dailyStudentKeys - 삭제할 일일 학생 키 배열
   * @returns 삭제 요청 객체 배열
   */
  createDeleteRequestBatch(
    groupKey: string,
    dailyStudentKeys: string[],
  ): DeleteRequest[] {
    return dailyStudentKeys.map((dailyStudentKey) => ({
      DeleteRequest: { Key: { groupKey, dailyStudentKey } },
    }));
  }

  /**
   * 일괄 처리용 생성 요청 객체들을 생성합니다
   * @param attendanceItems - 생성할 출석부 아이템 배열
   * @returns 쓰기 요청 객체 배열
   */
  createPutRequestBatch(attendanceItems: IAttendanceCore[]): WriteRequest[] {
    return attendanceItems.map((item) => ({
      PutRequest: { Item: buildAttendanceItem(item) },
    }));
  }

  //* ----------------------------------------------------------------------- */
  //* PRIVATE IMPLEMENTATION METHODS
  //* ----------------------------------------------------------------------- */

  /**
   * 출석부 기록 생성의 메인 orchestration 메서드
   */
  private async createAttendances(
    schoolId: number,
    termId: number,
    fromDate: string,
    toDate: string,
  ): Promise<ResponseAttendanceDto> {
    const startsAt = fromZonedTime(`${fromDate}T00:00:00`, 'Asia/Seoul');
    const endsAt = fromZonedTime(`${toDate}T23:59:59`, 'Asia/Seoul');

    const schooldays = await this.fetchSchooldays(
      schoolId,
      termId,
      startsAt,
      endsAt,
    );
    const attendances = this.buildAttendances(schooldays);
    const writeRequests = this.createPutRequestBatch(attendances);

    return this.executeBatchOperations(writeRequests);
  }

  /**
   * 필터링 조건에 따라 수업일 기록들을 조회합니다
   */
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

  private buildAttendances(schooldays: Schoolday[]): IAttendance[] {
    if (schooldays.length === 0) {
      return [];
    }

    const attendances: IAttendance[] = [];

    for (const schoolday of schooldays) {
      if (!schoolday.group?.picks) continue;

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
   * 학기 중간에 들어오거나 나간 전학생들의 경우 처리하는 로직
   * - 만일 startedBy or endedBy 가 null 이 아니면 전학생이다.
   * - 만일 전학생인 경우 그들의 start ~ end 기간인지 확인한다.
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

  /**
   * 학생 한 명에 대한 출석부 아이템을 구축합니다
   */
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

  /**
   * 단일 DynamoDB 작업(생성 또는 삭제)을 처리합니다
   */
  private async processIndividualOperation(
    item: WriteRequest | DeleteRequest,
  ): Promise<'success' | 'failed' | 'already_exists'> {
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
      return 'success';
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        return 'already_exists';
      }
      this.logger.error('DynamoDB operation failed', error);
      return 'failed';
    }
  }

  private async findTermsByDate(dateString: string): Promise<Term[]> {
    return this.termRepository.find({
      where: {
        start: LessThanOrEqual(dateString),
        end: MoreThanOrEqual(dateString),
      },
    });
  }

  private async createAttendancesForTerm(
    term: Term,
    dateString: string,
  ): Promise<ResponseAttendanceDto> {
    return this.createAttendances(
      term.schoolId,
      term.id,
      dateString,
      dateString,
    );
  }

  private getDateString(date?: string): string {
    const targetDate = date ? new Date(date) : new Date();
    return targetDate.toISOString().split('T')[0];
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
      const result = await this.processIndividualOperation(item);
      if (result === 'already_exists') alreadyExists++;
      if (result === 'failed') failedBatches++;
    }

    return { alreadyExists, failedBatches };
  }
}
