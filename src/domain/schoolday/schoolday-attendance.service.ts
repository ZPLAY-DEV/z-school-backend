import {
  CreateTableCommand,
  DeleteTableCommand,
  DescribeTableCommand,
} from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  PutCommand,
  ScanCommand,
  ScanCommandInput,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { ClassStatus } from 'src/common/enums';
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
  generateDailyStudentKey,
  generateGroupKey,
} from 'src/domain/attendance/utils/attendance.utils';
import { Group } from 'src/domain/group/entities/group.entity';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import {
  BuildAttendanceBodyDto,
  CreateDynamoRecordWithDateDto,
  CreateDynamoRecordWithRangeDto,
  DeleteAttendanceBySchoolTermDto,
  DeleteGroupAttendanceWithDateDto,
  ResponseAttendanceDto,
} from 'src/domain/schoolday/dto/response-attendance.dto';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { chunk } from 'src/helpers/array';
import { getDateString } from 'src/helpers/date';
import { formatDateInKST } from 'src/helpers/time';
import { DynamoService } from 'src/services/aws/dynamo.service';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';

@Injectable()
export class SchooldayAttendanceService {
  private readonly logger = new Logger(SchooldayAttendanceService.name);
  private readonly attendanceTableName: string;

  constructor(
    @InjectRepository(Schoolday)
    private readonly schooldayRepository: Repository<Schoolday>,
    @InjectRepository(Term)
    private readonly termRepository: Repository<Term>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    private readonly dynamoService: DynamoService,
    private readonly configService: ConfigService,
  ) {
    const environment = this.configService.get<string>('nodeEnv', 'dev');
    this.attendanceTableName = `${environment}_attendance_table`;
  }

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

  /**
   * 🔍 데이터량 분석 메서드 - 실제 처리 없이 데이터량만 확인
   */
  async analyzeDataVolume(dto: CreateDynamoRecordWithRangeDto): Promise<{
    schooldays: number;
    totalGroups: number;
    totalStudents: number;
    estimatedAttendanceRecords: number;
    processingTimeEstimate: string;
    recommendations: string[];
  }> {
    const startTime = Date.now();

    this.logger.log(`🔍 데이터량 분석 시작: ${JSON.stringify(dto)}`);

    const schooldays = await this.getValidatedSchooldays(
      dto.schoolId,
      dto.termId,
      dto.from,
      dto.to,
    );

    const analysisTime = Date.now() - startTime;
    this.logger.log(
      `📊 수업일 조회 완료: ${schooldays.length}개, 소요시간: ${analysisTime}ms`,
    );

    let totalGroups = 0;
    let totalStudents = 0;
    let estimatedRecords = 0;

    const groupStats: Record<number, { students: number; days: number }> = {};

    for (const schoolday of schooldays) {
      if (schoolday.group) {
        const groupId = schoolday.group.id;

        if (!groupStats[groupId]) {
          totalGroups++;
          groupStats[groupId] = {
            students:
              schoolday.group.picks?.filter(
                (pick) =>
                  pick.student &&
                  this.isStudentActiveOnDate(pick, schoolday.startsAt),
              ).length || 0,
            days: 0,
          };
          totalStudents += groupStats[groupId].students;
        }

        groupStats[groupId].days++;
        estimatedRecords += groupStats[groupId].students;
      }
    }

    const recommendations: string[] = [];

    if (estimatedRecords > 10000) {
      recommendations.push('🚨 대량 데이터 감지! 주 단위 분할 처리 권장');
    }

    if (estimatedRecords > 5000) {
      recommendations.push('⚠️ 백그라운드 작업 큐 사용 권장');
    }

    if (totalGroups > 50) {
      recommendations.push('📈 그룹 수 많음: 병렬 처리 고려');
    }

    const estimatedProcessingTime =
      this._estimateProcessingTime(estimatedRecords);

    const result = {
      schooldays: schooldays.length,
      totalGroups,
      totalStudents,
      estimatedAttendanceRecords: estimatedRecords,
      processingTimeEstimate: estimatedProcessingTime,
      recommendations,
      queryTime: `${analysisTime}ms`,
      dateRange: `${dto.from} ~ ${dto.to}`,
      groupBreakdown: Object.entries(groupStats).map(([groupId, stats]) => ({
        groupId: Number(groupId),
        studentsCount: stats.students,
        schooldaysCount: stats.days,
        recordsCount: stats.students * stats.days,
      })),
    };

    this.logger.log(`🎯 분석 완료:`, result);
    return result;
  }

  private _estimateProcessingTime(recordCount: number): string {
    // DynamoDB BatchWrite 성능 기준 (100개씩 처리)
    const batchCount = Math.ceil(recordCount / 100);
    const estimatedSeconds = batchCount * 0.5; // 배치당 약 0.5초 가정

    if (estimatedSeconds < 60) {
      return `약 ${Math.ceil(estimatedSeconds)}초`;
    } else if (estimatedSeconds < 3600) {
      return `약 ${Math.ceil(estimatedSeconds / 60)}분`;
    } else {
      return `약 ${Math.ceil(estimatedSeconds / 3600)}시간`;
    }
  }

  async createAttendanceForAllValidTerms(
    date?: string,
  ): Promise<ResponseAttendanceDto> {
    // 해당 날짜에 유효한 모든 학기 찾기
    const dateString = getDateString(date);
    const validTerms = await this.findTermsByDate(dateString);

    if (validTerms.length === 0) {
      return { schooldays: 0, failedBatches: 0, alreadyExists: 0 };
    }

    const allAttendances: IAttendance[] = [];

    for (const term of validTerms) {
      // 해당 학기의 해당 날짜에 있는 모든 수업일 찾기 (모든 lesson > group)
      const schooldays = await this.fetchSchooldaysByDate(
        term.schoolId,
        term.id,
        dateString,
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

  /**
   * DynamoDB attendance 테이블을 완전히 삭제하고 다시 생성합니다.
   * 모든 데이터가 즉시 삭제되므로 주의해서 사용해야 합니다.
   */
  async purge(): Promise<void> {
    this.logger.log('🗑️ Starting table purge process...');

    try {
      // DynamoDB 테이블 삭제
      this.logger.log('🗑️ Deleting attendance table...');
      await this.dynamoService.send(
        new DeleteTableCommand({
          TableName: this.attendanceTableName,
        }),
      );

      this.logger.log('⏳ Waiting for table deletion to complete...');
      await this._waitForTableDeletion();

      // DynamoDB 테이블 재생성
      this.logger.log('🔄 Creating attendance table...');
      await this.dynamoService.send(
        new CreateTableCommand({
          TableName: this.attendanceTableName,
          BillingMode: 'PAY_PER_REQUEST',
          AttributeDefinitions: [
            {
              AttributeName: 'groupKey',
              AttributeType: 'S',
            },
            {
              AttributeName: 'dailyStudentKey',
              AttributeType: 'S',
            },
          ],
          KeySchema: [
            {
              AttributeName: 'groupKey',
              KeyType: 'HASH',
            },
            {
              AttributeName: 'dailyStudentKey',
              KeyType: 'RANGE',
            },
          ],
        }),
      );

      this.logger.log('⏳ Waiting for table creation to complete...');
      await this._waitForTableCreation();

      this.logger.log('✅ Table purge completed successfully');
    } catch (error) {
      this.logger.error('❌ Failed to purge table', error);
      throw error;
    }
  }

  /**
   * 테이블 삭제가 완료될 때까지 대기
   */
  private async _waitForTableDeletion(): Promise<void> {
    const maxAttempts = 30; // 최대 30회 시도 (약 5분)
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        await this.dynamoService.send(
          new DescribeTableCommand({
            TableName: this.attendanceTableName,
          }),
        );
        // 테이블이 아직 존재하면 계속 대기
        await new Promise((resolve) => setTimeout(resolve, 10000)); // 10초 대기
        attempts++;
      } catch (error) {
        if (error.name === 'ResourceNotFoundException') {
          // 테이블이 삭제됨
          return;
        }
        throw error;
      }
    }

    throw new Error('Table deletion timeout');
  }

  /**
   * 테이블 생성이 완료될 때까지 대기
   */
  private async _waitForTableCreation(): Promise<void> {
    const maxAttempts = 30; // 최대 30회 시도 (약 5분)
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const result = await this.dynamoService.send(
          new DescribeTableCommand({
            TableName: this.attendanceTableName,
          }),
        );
        if (result.Table?.TableStatus === 'ACTIVE') {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 10000)); // 10초 대기
        attempts++;
      } catch (error) {
        if (error.name !== 'ResourceNotFoundException') {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 10000)); // 10초 대기
        attempts++;
      }
    }

    throw new Error('Table creation timeout');
  }

  /**
   * 특정 그룹의 모든 출석 데이터를 완전히 삭제합니다.
   * DynamoDB에서 해당 partition key의 모든 레코드를 스캔하여 삭제합니다.
   *
   * @param groupKey DynamoDB partition key (e.g., "GROUP#25")
   * @returns 삭제된 레코드 수와 결과 정보
   */
  async deleteAllAttendancesByGroupKey(
    groupKey: string,
  ): Promise<ResponseAttendanceDto> {
    try {
      this.logger.log(`🗑️ Deleting all attendances for groupKey: ${groupKey}`);

      // 1. DynamoDB에서 해당 partition key의 모든 레코드 스캔
      const allItems: IAttendance[] = [];
      let lastEvaluatedKey: any = undefined;

      do {
        const scanParams: ScanCommandInput = {
          TableName: this.attendanceTableName,
          FilterExpression: 'groupKey = :groupKey',
          ExpressionAttributeValues: {
            ':groupKey': groupKey,
          },
        };

        if (lastEvaluatedKey) {
          scanParams.ExclusiveStartKey = lastEvaluatedKey;
        }

        const result = await this.dynamoService.send(
          new ScanCommand(scanParams),
        );

        if (result.Items && result.Items.length > 0) {
          allItems.push(...(result.Items as IAttendance[]));
        }

        lastEvaluatedKey = result.LastEvaluatedKey;
      } while (lastEvaluatedKey);

      if (allItems.length === 0) {
        this.logger.log(
          `📭 No attendance records found for groupKey: ${groupKey}`,
        );
        return { schooldays: 0, failedBatches: 0, alreadyExists: 0 };
      }

      // 2. 삭제 요청 생성
      const deleteRequests: DeleteRequest[] = allItems.map((item) => ({
        DeleteRequest: {
          Key: {
            groupKey: item.groupKey,
            dailyStudentKey: item.dailyStudentKey,
          },
        },
      }));

      this.logger.log(
        `🗑️ Deleting ${allItems.length} attendance records for groupKey: ${groupKey}`,
      );

      // 3. 배치 삭제 실행
      const result = await this.executeBatchOperations(deleteRequests);

      this.logger.log(
        `✅ Successfully deleted attendances for groupKey: ${groupKey}`,
        result,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `❌ Failed to delete attendances for groupKey: ${groupKey}`,
        error,
      );
      return { schooldays: 0, failedBatches: 1, alreadyExists: 0 };
    }
  }

  /**
   * 특정 학교/학기의 모든 그룹에 대해 완전한 출석 데이터 삭제를 수행합니다.
   * 기존 메서드의 개선된 버전으로, 쓰레기 데이터까지 완전히 제거합니다.
   *
   * @param dto 학교/학기 정보
   * @returns 삭제된 레코드 수와 결과 정보
   */
  async deleteAllAttendancesBySchoolAndTerm(
    dto: DeleteAttendanceBySchoolTermDto,
  ): Promise<ResponseAttendanceDto> {
    try {
      this.logger.log(
        `🗑️ Starting complete deletion for schoolId: ${dto.schoolId}, termId: ${dto.termId}`,
      );

      // 1. 해당 학교/학기의 모든 그룹 조회
      const groups = await this.groupRepository.find({
        where: {
          lesson: {
            schoolId: dto.schoolId,
            termId: dto.termId,
          },
        },
        relations: ['lesson'],
      });

      if (groups.length === 0) {
        this.logger.log(
          `📭 No groups found for schoolId: ${dto.schoolId}, termId: ${dto.termId}`,
        );
        return { schooldays: 0, failedBatches: 0, alreadyExists: 0 };
      }

      // 2. 각 그룹별로 모든 출석 데이터 삭제
      let totalDeleted = 0;
      let totalFailedBatches = 0;
      let totalAlreadyExists = 0;

      for (const group of groups) {
        const groupKey = generateGroupKey(group.id);
        this.logger.log(
          `🗑️ Deleting attendances for group: ${group.groupName} (${groupKey})`,
        );

        const result = await this.deleteAllAttendancesByGroupKey(groupKey);

        totalDeleted += result.schooldays;
        totalFailedBatches += result.failedBatches;
        totalAlreadyExists += result.alreadyExists || 0;
      }

      const finalResult = {
        schooldays: totalDeleted,
        failedBatches: totalFailedBatches,
        alreadyExists: totalAlreadyExists,
      };

      this.logger.log(
        `✅ Complete deletion finished for schoolId: ${dto.schoolId}, termId: ${dto.termId}`,
        finalResult,
      );
      return finalResult;
    } catch (error) {
      this.logger.error(
        `❌ Failed to delete all attendances for schoolId: ${dto.schoolId}, termId: ${dto.termId}`,
        error,
      );
      return { schooldays: 0, failedBatches: 1, alreadyExists: 0 };
    }
  }

  async deleteGroupAttendanceWithDate(
    dto: DeleteGroupAttendanceWithDateDto,
  ): Promise<ResponseAttendanceDto> {
    const dateString = getDateString(dto.date);
    return this.deleteGroupAttendancesWithScan(
      dto.schoolId,
      dto.termId,
      dto.groupId,
      dateString,
    );
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
      schoolday.group.status === ClassStatus.ACTIVE &&
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
      return { schooldays: 0, failedBatches: 0, alreadyExists: 0 };
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
      schooldays: items.length,
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

      const { group, startsAt, lessonId, groupId } = schoolday;
      const localDate = formatDateInKST(startsAt);
      const expires = Math.floor(addDays(new Date(), 400).getTime() / 1000);

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
            weekday: group.weekday,
            weekNumber: schoolday.weekNumber,
            expires,
          }),
        );

      attendances.push(...dayAttendances);
    }

    return attendances;
  }

  /**
   * 그만둔 학생 처리: start/end 기간 확인
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
      weekday: dto.weekday,
      weekNumber: dto.weekNumber,
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
              TableName: this.attendanceTableName,
              Item: item.PutRequest.Item,
              ConditionExpression: 'attribute_not_exists(groupKey)',
            },
          };
        } else {
          return {
            Delete: {
              TableName: this.attendanceTableName,
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
              TableName: this.attendanceTableName,
              Item: item.PutRequest.Item,
              ConditionExpression:
                'attribute_not_exists(groupKey) AND attribute_not_exists(dailyStudentKey)',
            }),
          );
        } else {
          await this.dynamoService.send(
            new DeleteCommand({
              TableName: this.attendanceTableName,
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

  private async deleteGroupAttendances(
    schoolId: number,
    termId: number,
    groupId: number,
    date: string,
  ): Promise<ResponseAttendanceDto> {
    const schooldays = await this.fetchSchooldaysByDateAndGroup(
      schoolId,
      termId,
      groupId,
      date,
    );

    // 유효한 수업일들만 필터링
    const validSchooldays = schooldays.filter((schoolday) =>
      this.isValidSchooldayForAttendance(schoolday),
    );

    const deleteRequests = this.buildDeleteRequests(validSchooldays);
    return this.executeBatchOperations(deleteRequests);
  }

  private async deleteGroupAttendancesWithScan(
    schoolId: number,
    termId: number,
    groupId: number,
    date: string,
  ): Promise<ResponseAttendanceDto> {
    // 1. 해당 날짜에 수업이 있는지 확인
    const schooldays = await this.fetchSchooldaysByDateAndGroup(
      schoolId,
      termId,
      groupId,
      date,
    );

    if (schooldays.length === 0) {
      return { schooldays: 0, failedBatches: 0, alreadyExists: 0 };
    }

    // 2. 유효한 수업일들만 필터링
    const validSchooldays = schooldays.filter((schoolday) =>
      this.isValidSchooldayForAttendance(schoolday),
    );

    if (validSchooldays.length === 0) {
      return { schooldays: 0, failedBatches: 0, alreadyExists: 0 };
    }

    // 3. DynamoDB에서 실제 존재하는 레코드만 스캔하여 삭제
    const groupKey = generateGroupKey(groupId);
    const prefix = `DATE#${date}`;

    try {
      const existingItems = await this.dynamoService.send(
        new ScanCommand({
          TableName: this.attendanceTableName,
          FilterExpression:
            'groupKey = :groupKey AND begins_with(dailyStudentKey, :prefix)',
          ExpressionAttributeValues: {
            ':groupKey': groupKey,
            ':prefix': prefix,
          },
        }),
      );

      if (!existingItems.Items || existingItems.Items.length === 0) {
        return { schooldays: 0, failedBatches: 0, alreadyExists: 0 };
      }

      // 4. 실제 존재하는 레코드들만 삭제 요청 생성
      const deleteRequests: DeleteRequest[] = existingItems.Items.map(
        (item) => ({
          DeleteRequest: {
            Key: {
              groupKey: item.groupKey,
              dailyStudentKey: item.dailyStudentKey,
            },
          },
        }),
      );

      return this.executeBatchOperations(deleteRequests);
    } catch (error) {
      this.logger.error('Failed to scan attendance records', error);
      return { schooldays: 0, failedBatches: 1, alreadyExists: 0 };
    }
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

  /**
   * 특정 날짜와 그룹에 해당하는 수업일들을 조회
   */
  private async fetchSchooldaysByDateAndGroup(
    schoolId: number,
    termId: number,
    groupId: number,
    targetDate: string,
  ): Promise<Schoolday[]> {
    const { startsAt, endsAt } = this.parseDateRange(targetDate);

    return this.schooldayRepository.find({
      where: {
        schoolId,
        termId,
        groupId,
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
}
