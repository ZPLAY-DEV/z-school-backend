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
import {
  BuildAttendanceForStudentDto,
  CreateAttendanceResultDto,
  CreateDynamoRecordWithDateDto,
  CreateDynamoRecordWithRangeDto,
} from 'src/domain/schoolday/dto/create-dynamo-record.dto';
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
  async createAllWithDate(date: string): Promise<CreateAttendanceResultDto[]> {
    const terms = await this.termRepository.find({
      where: {
        isActive: true,
      },
    });

    const results: CreateAttendanceResultDto[] = [];

    for (const term of terms) {
      const schoolId = term.schoolId;
      const termId = term.id;
      const startsAt = fromZonedTime(`${date}T00:00:00`, 'Asia/Seoul');
      const endsAt = fromZonedTime(`${date}T23:59:59`, 'Asia/Seoul');

      const result = await this.createAttendances(
        schoolId,
        termId,
        startsAt,
        endsAt,
      );
      results.push(result);
    }

    return results;
  }

  async createWithDate(
    dto: CreateDynamoRecordWithDateDto,
  ): Promise<CreateAttendanceResultDto> {
    const { schoolId, termId, date } = dto;

    const startsAt = fromZonedTime(`${date}T00:00:00`, 'Asia/Seoul');
    const endsAt = fromZonedTime(`${date}T23:59:59`, 'Asia/Seoul');

    return this.createAttendances(schoolId, termId, startsAt, endsAt);
  }

  /**
   * 기간 내 수업일 출석부를 일괄 생성합니다
   * @param dto - 학교ID, 학기ID, 시작날짜, 종료날짜가 포함된 데이터
   * @returns 생성된 총 기록 수, 실패 수, 이미 존재하는 기록 수를 반환
   */
  async createWithPeriod(
    dto: CreateDynamoRecordWithRangeDto,
  ): Promise<CreateAttendanceResultDto> {
    const { schoolId, termId, from, to } = dto;

    const startsAt = fromZonedTime(`${from}T00:00:00`, 'Asia/Seoul');
    const endsAt = fromZonedTime(`${to}T23:59:59`, 'Asia/Seoul');

    return this.createAttendances(schoolId, termId, startsAt, endsAt);
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
  ): Promise<CreateAttendanceResultDto> {
    if (items.length === 0) {
      return { total: 0, failedBatches: 0, alreadyExists: 0 };
    }

    // 100개씩 청크로 나누어 처리 (TransactWriteItems 제한)
    const chunks = chunk(items, 100);
    let totalAlreadyExists = 0;
    let totalFailedBatches = 0;

    for (const chunk of chunks) {
      const chunkResult = await this.executeTransactionChunk(chunk);
      totalAlreadyExists += chunkResult.alreadyExists;
      totalFailedBatches += chunkResult.failedBatches;
    }

    const result = {
      total: items.length,
      failedBatches: totalFailedBatches,
      alreadyExists: totalAlreadyExists,
    };

    this.logger.log(
      `Batch operation completed. Total: ${result.total}, Failed: ${result.failedBatches}, Already exists: ${result.alreadyExists}`,
    );
    return result;
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
      DeleteRequest: {
        Key: { groupKey, dailyStudentKey },
      },
    }));
  }

  /**
   * 일괄 처리용 생성 요청 객체들을 생성합니다
   * @param attendanceItems - 생성할 출석부 아이템 배열
   * @returns 쓰기 요청 객체 배열
   */
  createPutRequestBatch(attendanceItems: IAttendanceCore[]): WriteRequest[] {
    return attendanceItems.map((item) => ({
      PutRequest: {
        Item: buildAttendanceItem(item),
      },
    }));
  }

  //* ----------------------------------------------------------------------- */
  //* PRIVATE IMPLEMENTATION METHODS
  //* ----------------------------------------------------------------------- */

  /**
   * 출석부 기록 생성의 메인 orchestration 메서드
   */
  private async createAttendances(
    schoolId: number | undefined,
    termId: number | undefined,
    startsAt: Date,
    endsAt: Date,
  ): Promise<CreateAttendanceResultDto> {
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
    schoolId: number | undefined,
    termId: number | undefined,
    startsAt: Date,
    endsAt: Date,
  ): Promise<Schoolday[]> {
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

    return this.schooldayRepository.find({
      where: whereCondition,
      relations: {
        group: {
          groupStudents: { student: true },
          lesson: true,
        },
      },
    });
  }

  /**
   * 수업일 아이템들로부터 출석부 아이템들을 구축합니다
   */
  private buildAttendances(schooldays: Schoolday[]): IAttendance[] {
    const attendances: IAttendance[] = [];
    for (const schoolday of schooldays) {
      const attendancesForTheDay = this.buildAttendancesForTheDay(schoolday);
      attendances.push(...attendancesForTheDay);
    }

    return attendances;
  }

  /**
   * 단일 수업일에 대한 출석부 아이템들을 생성합니다.
   * 당연한 이야기지만, picks (수강확정된 학생) 관계가 없으면 생성 안된다.
   */
  private buildAttendancesForTheDay(schoolday: Schoolday): IAttendance[] {
    const { group, startsAt, duration, lessonId, groupId } = schoolday;
    const { groupStudents: picks, groupName, lesson } = group;
    const localDate = formatDateInKST(startsAt);
    const expires = calculateTtl(addDays(new Date(), 365));
    const attendances: IAttendance[] = [];

    for (const pick of picks ?? []) {
      if (this.shouldSkipStudentForTheDay(pick, startsAt)) {
        continue;
      }

      const dto: BuildAttendanceForStudentDto = {
        pick,
        localDate,
        lessonId,
        lessonName: lesson?.lessonName,
        groupId,
        groupName,
        start: group.start,
        end: group.end,
        duration,
        expires,
      };
      const attendance = this.buildAttendanceForStudent(dto);

      attendances.push(attendance);
    }

    return attendances;
  }

  /**
   * 수업종료일이 설정된 학생이 있으면, 그 학생은 제외해야 한다.
   */
  private shouldSkipStudentForTheDay(pick: any, startsAt: Date): boolean {
    if (!pick.endedOn) return false;

    const endDate = fromZonedTime(`${pick.endedOn}T23:59:59`, 'Asia/Seoul');
    return endDate < startsAt;
  }

  /**
   * 학생 한 명에 대한 출석부 아이템을 구축합니다
   */
  private buildAttendanceForStudent(
    dto: BuildAttendanceForStudentDto,
  ): IAttendance {
    const {
      pick,
      localDate,
      lessonId,
      lessonName,
      groupId,
      groupName,
      start,
      end,
      duration,
      expires,
    } = dto;
    const groupKey = generateGroupKey(groupId);
    const dailyStudentKey = generateDailyStudentKey(
      localDate,
      pick.student.id,
      pick.student.grade,
      pick.student.class,
      pick.student.studentCode,
    );

    return {
      groupKey,
      dailyStudentKey,
      lessonId,
      lessonName: lessonName || '',
      groupId,
      groupName,
      studentId: pick.student.id,
      studentName: pick.student.name,
      start,
      end,
      duration,
      status: AttendanceStatus.PENDING,
      expires,
    } as IAttendance;
  }

  /**
   * 단일 DynamoDB 작업(생성 또는 삭제)을 처리합니다
   */
  private async processIndividualOperation(
    item: WriteRequest | DeleteRequest,
  ): Promise<'success' | 'failed' | 'already_exists'> {
    try {
      if ('PutRequest' in item) {
        await this.executePutOperation(item.PutRequest.Item);
      } else if ('DeleteRequest' in item) {
        await this.executeDeleteOperation(item.DeleteRequest.Key);
      }
      return 'success';
    } catch (error: any) {
      return this.handleOperationError(error);
    }
  }

  /**
   * Executes a conditional put operation
   */
  private async executePutOperation(item: any): Promise<void> {
    await this.dynamoService.send(
      new PutCommand({
        TableName: ATTENDANCE_TABLE_NAME,
        Item: item,
        ConditionExpression:
          'attribute_not_exists(groupKey) AND attribute_not_exists(dailyStudentKey)',
      }),
    );
  }

  /**
   * Executes a delete operation
   */
  private async executeDeleteOperation(key: any): Promise<void> {
    await this.dynamoService.send(
      new DeleteCommand({
        TableName: ATTENDANCE_TABLE_NAME,
        Key: key,
      }),
    );
  }

  /**
   * Handles errors from DynamoDB operations
   */
  private handleOperationError(error: any): 'failed' | 'already_exists' {
    if (
      error.name === 'ConditionalCheckFailedException' ||
      error.code === 'ConditionalCheckFailedException'
    ) {
      this.logger.log('Item already exists, skipping...');
      return 'already_exists';
    }

    this.logger.error('DynamoDB operation failed', error);
    return 'failed';
  }

  /**
   * 청크 단위로 TransactWriteItems를 실행합니다
   */
  private async executeTransactionChunk(
    items: (WriteRequest | DeleteRequest)[],
  ): Promise<{ alreadyExists: number; failedBatches: number }> {
    try {
      // WriteRequest/DeleteRequest를 TransactWriteItem 형식으로 변환
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

      // TransactWriteItems 실행
      await this.dynamoService.send(
        new TransactWriteCommand({
          TransactItems: transactItems,
        }),
      );

      return { alreadyExists: 0, failedBatches: 0 };
    } catch (error) {
      this.logger.error(`Transaction failed:`, error);

      if (
        error.name === 'TransactionCanceledException' ||
        error.code === 'TransactionCanceledException'
      ) {
        // TransactionCanceledException의 경우 개별 처리로 fallback
        return this.fallbackToIndividualProcessing(items);
      }

      // 기타 에러의 경우 전체 청크 실패로 처리
      return { alreadyExists: 0, failedBatches: items.length };
    }
  }

  /**
   * 트랜잭션 실패시 개별 처리로 fallback
   */
  private async fallbackToIndividualProcessing(
    items: (WriteRequest | DeleteRequest)[],
  ): Promise<{ alreadyExists: number; failedBatches: number }> {
    let alreadyExists = 0;
    let failedBatches = 0;

    for (const item of items) {
      const result = await this.processIndividualOperation(item);
      if (result === 'already_exists') {
        alreadyExists++;
      } else if (result === 'failed') {
        failedBatches++;
      }
    }

    return { alreadyExists, failedBatches };
  }
}
