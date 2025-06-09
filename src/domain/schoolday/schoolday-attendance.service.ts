import {
  DeleteCommand,
  PutCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { fromZonedTime } from 'date-fns-tz';
import { AttendanceStatus } from 'src/common/enums/attendance-status';
import {
  ATTENDANCE_CONSTANTS,
  AttendanceItem,
  DeleteRequest,
  WriteRequest,
} from 'src/domain/attendance/types/attendance.types';
import {
  buildAttendanceItem,
  calculateTtl,
  formatToLocalDateString,
  generateDailyStudentKey,
  generateGroupKey,
} from 'src/domain/attendance/utils/attendance.utils';
import {
  CreateAttendanceResultDto,
  CreateDynamoRecordWithDateDto,
  CreateDynamoRecordWithRangeDto,
} from 'src/domain/schoolday/dto/create-dynamo-record.dto';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
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
    private readonly dynamoService: DynamoService,
  ) {}

  //* ----------------------------------------------------------------------- */
  //* PUBLIC API METHODS
  //* ----------------------------------------------------------------------- */

  /**
   * 특정 날짜의 수업일 출석부를 생성합니다
   * @param dto - 학교ID, 학기ID, 날짜가 포함된 데이터
   * @returns 생성된 총 기록 수, 실패 수, 이미 존재하는 기록 수를 반환
   */
  async createAttendanceForDate(
    dto: CreateDynamoRecordWithDateDto,
  ): Promise<CreateAttendanceResultDto> {
    const { schoolId, termId, date } = dto;

    const startsAt = this.createTimezoneDate(date, '00:00:00');
    const endsAt = this.createTimezoneDate(date, '23:59:59');

    return this.processAttendanceCreation(schoolId, termId, startsAt, endsAt);
  }

  /**
   * 기간 내 수업일 출석부를 일괄 생성합니다
   * @param dto - 학교ID, 학기ID, 시작날짜, 종료날짜가 포함된 데이터
   * @returns 생성된 총 기록 수, 실패 수, 이미 존재하는 기록 수를 반환
   */
  async createAttendanceForPeriod(
    dto: CreateDynamoRecordWithRangeDto,
  ): Promise<CreateAttendanceResultDto> {
    const { schoolId, termId, from, to } = dto;

    const startsAt = this.createTimezoneDate(from, '00:00:00');
    const endsAt = this.createTimezoneDate(to, '23:59:59');

    return this.processAttendanceCreation(schoolId, termId, startsAt, endsAt);
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
    const chunks = this.chunkArray(items, 100);
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

    this.logBatchResult(result);
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
  createPutRequestBatch(attendanceItems: AttendanceItem[]): WriteRequest[] {
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
  private async processAttendanceCreation(
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
    const attendanceItems = this.buildAttendanceItems(schooldays, startsAt);
    const writeRequests = this.createPutRequestBatch(attendanceItems);

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
    const whereCondition = this.buildSchoolDayWhereCondition(
      schoolId,
      termId,
      startsAt,
      endsAt,
    );

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
   * 수업일 데이터로부터 출석부 아이템들을 구축합니다
   */
  private buildAttendanceItems(
    schooldays: Schoolday[],
    startsAt: Date,
  ): AttendanceItem[] {
    const attendanceItems: AttendanceItem[] = [];
    const expires = calculateTtl(startsAt);

    for (const schoolday of schooldays) {
      const schooldayItems = this.createAttendanceItemsForSchoolday(
        schoolday,
        expires,
      );
      attendanceItems.push(...schooldayItems);
    }

    return attendanceItems;
  }

  /**
   * 단일 수업일에 대한 출석부 아이템들을 생성합니다
   */
  private createAttendanceItemsForSchoolday(
    schoolday: Schoolday,
    expires: number,
  ): AttendanceItem[] {
    const { group, startsAt, duration, lessonId, groupId } = schoolday;
    const { groupStudents: picks, groupName, lesson } = group;
    const localDate = formatToLocalDateString(startsAt);
    const items: AttendanceItem[] = [];

    for (const pick of picks ?? []) {
      if (this.shouldSkipStudentForSchoolday(pick, startsAt)) {
        continue;
      }

      const attendanceItem = this.buildAttendanceItemForStudent(
        pick,
        localDate,
        Number(groupId),
        String(groupName),
        Number(lessonId),
        lesson?.lessonName,
        String(group.start),
        String(group.end),
        Number(duration),
        expires,
      );

      items.push(attendanceItem);
    }

    return items;
  }

  /**
   * 해당 수업일에 대해 학생을 제외할지 판단합니다
   */
  private shouldSkipStudentForSchoolday(pick: any, startsAt: Date): boolean {
    if (!pick.endedOn) return false;

    const endDate = fromZonedTime(
      `${pick.endedOn}T23:59:59`,
      ATTENDANCE_CONSTANTS.TIME_ZONE,
    );

    return endDate < startsAt;
  }

  /**
   * 학생 한 명에 대한 출석부 아이템을 구축합니다
   */
  private buildAttendanceItemForStudent(
    pick: any,
    localDate: string,
    groupId: number,
    groupName: string,
    lessonId: number,
    lessonName: string | undefined,
    start: string,
    end: string,
    duration: number,
    expires: number,
  ): AttendanceItem {
    const groupKey = generateGroupKey(groupId);
    const dailyStudentKey = generateDailyStudentKey(
      localDate,
      pick.student.id as number,
      pick.student.grade as string,
      pick.student.class as string,
      pick.student.studentCode as number,
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
    if (this.isConditionalCheckFailure(error)) {
      this.logger.log('Item already exists, skipping...');
      return 'already_exists';
    }

    this.logger.error('DynamoDB operation failed', error);
    return 'failed';
  }

  //* ----------------------------------------------------------------------- */
  // UTILITY METHODS
  //* ----------------------------------------------------------------------- */

  /**
   * 타임존을 고려한 날짜 객체를 생성합니다
   */
  private createTimezoneDate(dateString: string, timeString: string): Date {
    return fromZonedTime(
      `${dateString}T${timeString}`,
      ATTENDANCE_CONSTANTS.TIME_ZONE,
    );
  }

  /**
   * 수업일 조회를 위한 WHERE 조건을 구축합니다
   */
  private buildSchoolDayWhereCondition(
    schoolId: number | undefined,
    termId: number | undefined,
    startsAt: Date,
    endsAt: Date,
  ): any {
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

    return whereCondition;
  }

  /**
   * 에러가 조건 체크 실패인지 확인합니다
   */
  private isConditionalCheckFailure(error: any): boolean {
    return (
      error.name === 'ConditionalCheckFailedException' ||
      error.code === 'ConditionalCheckFailedException'
    );
  }

  /**
   * 일괄 작업 결과를 로그로 기록합니다
   */
  private logBatchResult(result: CreateAttendanceResultDto): void {
    this.logger.log(
      `Batch operation completed. Total: ${result.total}, Failed: ${result.failedBatches}, Already exists: ${result.alreadyExists}`,
    );
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

      if (this.isTransactionCancelled(error)) {
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

  /**
   * 배열을 지정된 크기의 청크로 나눕니다
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * TransactionCanceledException 여부를 확인합니다
   */
  private isTransactionCancelled(error: any): boolean {
    return (
      error.name === 'TransactionCanceledException' ||
      error.code === 'TransactionCanceledException'
    );
  }
}
