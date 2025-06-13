import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateDispatchDto } from './dto/create-dispatch.dto';
import { DataSource, EntityManager, In } from 'typeorm';
import { School } from '../school/entities/school.entity';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { Term } from '../term/entities/term.entity';
import { Phone } from '../phone/entities/phone.entity';
import { DispatchMode } from 'src/common/enums';
import { Dispatch } from './entities/dispatch.entity';
import { Student } from '../student/entities/student.entity';
import { SchedulerService } from 'src/services/scheduler/scheduler.service';
import { AWS_SQS_CLIENT, REDIS_DISPATCH_CLIENT } from 'src/common/constants';
import { SqsService } from 'src/services/aws/sqs.service';
import { RedisDispatchService } from 'src/services/redis/redis-dispatch.service';
import { nanoid } from 'nanoid';
import { parseValidityToDate } from 'src/helpers/time';
import { NanoId } from '../parent/entities/nanoid.entity';
import { DispatchRead } from './entities/dispatch-read.entity';
import { Sam } from '../sam/entities/sam.entity';
import { IDispatchResponse, IMixedTargetMessage } from 'src/common/interfaces';

@Injectable()
export class DispatchCoreService {
  private readonly logger = new Logger(DispatchCoreService.name);
  constructor(
    @Inject(AWS_SQS_CLIENT)
    private readonly sqsClient: SqsService,
    @Inject(REDIS_DISPATCH_CLIENT)
    private readonly redisDispatchService: RedisDispatchService,
    private readonly dataSource: DataSource,
    private readonly schedulerService: SchedulerService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  //? 학생 대상 발송 ( 학생은 MIXED 발송 )
  async createParentDispatch(dto: CreateDispatchDto): Promise<Dispatch> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      //? 1) 유효성 검증
      await this.validateSchoolAndTerm(manager, dto);
      await this.validateSchoolPhone(manager, dto);

      //? 2) 발송 정보 생성
      const dispatch = await this.createDispatch(manager, dto);

      // 3. 학부모 정보 조회
      const students = await this.getParentInfo(manager, dto.targetIds);

      if (!students.length) {
        throw new NotFoundException(
          'No parents found for the given student IDs',
        );
      }

      // 4. NanoId 및 메시지 데이터 생성
      const { nanoIdData, pushPayload } = this.createNanoIdAndMessages(
        students,
        dispatch.id,
        dto,
      );

      // 5. NanoId 벌크 upsert
      await this.upsertNanoIds(manager, nanoIdData);

      // 6. students 중복 제거
      const uniqueParentIds = [
        ...new Set(students.map((student) => student.parent.id)),
      ];

      //7. DispatchRead 데이터 생성 및 upsert
      await this.upsertDispatchReads(manager, uniqueParentIds, dispatch.id);

      /**
       * 7. DispatchRead 데이터 생성 및 upsert
       * @todo
       * 저장방식은 mSet이 아니라 Set 형식을 고려
       * ttl은 30분 정도 -> 왜? 문자 보내고 웬만하면 바로 링크
       * 30분에 없으면 redis 안찍고 db 찍고 오는 형식으로 처리필요.
       * */

      // 8. Redis key: (dispatchId + parentId), value: count -> bulk redis insert
      if (dto.mode !== DispatchMode.DRAFT) {
        const keyValuePairs: Record<string, string> = {};
        const dispatchId = dispatch.id;
        uniqueParentIds.forEach((parentId) => {
          keyValuePairs[`dispatch:${dispatchId}:parent:${parentId}`] = '0';
        });

        await this.redisDispatchService.initParentReadStatus(keyValuePairs);
      }

      // 9. 발송 유형에 맞는 이벤트 발송
      await this.handleDispatchEvent(dto, pushPayload, dispatch);

      return dispatch;
    });
  }

  //? 강사 대상 발송 ( 강사는 FCM만 발송 )
  async createInstructorDispatch(dto: CreateDispatchDto): Promise<Dispatch> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      //? 1) 유효성 검증
      await this.validateSchoolAndTerm(manager, dto);
      //? 2) 발송 정보 생성
      const dispatch = await this.createDispatch(manager, dto);
      //? 3) 강사 정보 조회
      const instructors = await this.getInstructorInfo(manager, dto.targetIds);

      // 강사는 열람 여부 nanoId 필요없음. 앱을 강제화 SQS, EventBridge 예약 이벤트만 등록

      // await this.handleDispatchEvent(dto, saveDispatch);

      return dispatch;
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Private Methods
  //? ---------------------------------------------------------------------- ?//

  //? NanoId 및 Message 데이터 생성
  private createNanoIdAndMessages(
    students: Student[],
    dispatchId: number,
    dto: CreateDispatchDto,
  ): { nanoIdData: Partial<NanoId>[]; pushPayload: IDispatchResponse } {
    const nanoIdData: Partial<NanoId>[] = [];
    const messages: IMixedTargetMessage[] = [];

    for (const student of students) {
      const parent = student.parent;
      const generatedNanoId = nanoid();
      const nanoIdDto = {
        parentId: parent.id,
        nanoid: generatedNanoId,
        phone: parent.phone,
        target: 'dispatches',
        targetArgs: `https://z-school.com/dispatchId=${dispatchId}&studentId=${student.id}&nanoid=${generatedNanoId}`,
        expiresAt: parseValidityToDate('30d'), // 수강신청 끝나는 시점으로 지정 해야함.
      };

      const message = {
        id: parent.id,
        token: parent.pushToken ?? '',
        phone: parent.phone,
        title: dto.title,
        body: dto.title,
        role: 'PARENT' as const,
        target: nanoIdDto.target,
        targetArgs: nanoIdDto.targetArgs,
      };

      nanoIdData.push(nanoIdDto);
      messages.push(message);
    }
    // 최종 pushPayload
    const pushPayload: IDispatchResponse = {
      messages,
      type: 'ping.class',
      school: dto.schoolId.toString(),
      role: 'PARENT',
    };

    return { nanoIdData, pushPayload };
  }

  //? NanoId 벌크 upsert
  private async upsertNanoIds(
    manager: EntityManager,
    nanoIdData: Partial<NanoId>[],
  ): Promise<void> {
    const batchSize = 1000;
    for (let i = 0; i < nanoIdData.length; i += batchSize) {
      const batch = nanoIdData.slice(i, i + batchSize);
      try {
        await manager
          .createQueryBuilder()
          .insert()
          .into(NanoId)
          .values(batch)
          .orUpdate(
            ['nanoid', 'phone', 'expiresAt'],
            ['parentId', 'target', 'targetArgs'],
          )
          .execute();
      } catch (error) {
        this.logger.error(`Failed to upsert NanoIds: ${error.message}`);
        throw new InternalServerErrorException('Failed to upsert NanoIds');
      }
    }
  }

  /**
   * ? DispatchRead 벌크 upsert
   * @param manager EntityManager
   * @param uniqueParentIds number[] ( 유니크한  학부모 id 배열 )
   * @param dispatchId number ( 발송 id )
   * @returns void
   */
  private async upsertDispatchReads(
    manager: EntityManager,
    uniqueParentIds: number[],
    dispatchId: number,
  ): Promise<void> {
    // dispatchReadData 생성
    const dispatchReadData = uniqueParentIds.map((parentId) => ({
      parentId,
      dispatchId,
    }));

    const batchSize = 1000;
    for (let i = 0; i < dispatchReadData.length; i += batchSize) {
      const batch = dispatchReadData.slice(i, i + batchSize);
      try {
        await manager
          .createQueryBuilder()
          .insert()
          .into(DispatchRead)
          .values(batch)
          .orUpdate(['updatedAt'], ['parentId', 'dispatchId'])
          .execute();
      } catch (error) {
        this.logger.error(`Failed to upsert DispatchReads: ${error.message}`);
        throw new Error('Failed to upsert DispatchReads');
      }
    }
  }

  //? 학부모 정보 조회
  private async getParentInfo(
    manager: EntityManager,
    studentIds: number[],
  ): Promise<Student[]> {
    return await manager.find(Student, {
      where: { id: In(studentIds) },
      select: { id: true, parent: { id: true, phone: true, pushToken: true } },
      relations: { parent: true },
    });
  }

  //? 강사 정보 조회
  private async getInstructorInfo(
    manager: EntityManager,
    samIds: number[],
  ): Promise<Sam[]> {
    return await manager.find(Sam, {
      where: { id: In(samIds) },
      select: {
        id: true,
        instructor: { id: true, phone: true, pushToken: true },
      },
      relations: { instructor: true },
    });
  }

  //? 발송 정보 생성
  private async createDispatch(
    manager: EntityManager,
    dto: CreateDispatchDto,
  ): Promise<Dispatch> {
    const dispatch = manager.create(Dispatch, dto);
    return await manager.save(dispatch);
  }

  //? 학교 및 학기 유효성 검증
  private async validateSchoolAndTerm(
    manager: EntityManager,
    dto: CreateDispatchDto,
  ): Promise<void> {
    const school = await manager.findOne(School, {
      where: { id: dto.schoolId },
    });
    if (!school) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_SCHOOL);
    }

    const term = await manager.findOne(Term, { where: { id: dto.termId } });
    if (!term) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_TERM);
    }
  }

  //? 학교 발신 번호 유효성 검증
  private async validateSchoolPhone(
    manager: EntityManager,
    dto: CreateDispatchDto,
  ): Promise<void> {
    if (dto.mode === DispatchMode.DRAFT) return;

    const schoolPhone = await manager.findOne(Phone, {
      where: { schoolId: dto.schoolId, isActive: true },
    });

    if (!schoolPhone) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_PHONE_IN_SCHOOL);
    }
  }

  //? 발송 유형에 따른 이벤트 핸들링
  private async handleDispatchEvent(
    dto: CreateDispatchDto,
    pushPayload: IDispatchResponse,
    dispatch: Dispatch,
  ) {
    switch (dto.mode) {
      case DispatchMode.IMMEDIATE:
        await this.sqsClient.sendMessage({
          type: 'SEND_DISPATCH',
          data: pushPayload,
        });
        break;
      case DispatchMode.SCHEDULED:
        await this.scheduleDispatch(dto, pushPayload, dispatch);
        break;
      case DispatchMode.DRAFT:
        break;
    }
  }

  //? EventBridge 예약 이벤트 등록
  private async scheduleDispatch(
    dto: CreateDispatchDto,
    pushPayload: IDispatchResponse,
    dispatch: Dispatch,
  ) {
    if (!dto.reservationDate) {
      throw new Error('Reservation date is required for scheduled dispatch');
    }

    // const ruleName = `DispatchRule-${dispatch.id}-${Date.now()}`;

    // DispatchRule --> 이와 같은 Prefix를 별도로 지정 필요.
    const ruleName = `DispatchRule-${dispatch.id}`;
    const queueArn =
      process.env.AWS_SQS_ARN || 'arn:aws:sqs:ap-northeast-2:000000000000:main';

    try {
      const result = await this.schedulerService.schedule({
        ruleName,
        scheduleTime: dto.reservationDate,
        targets: [
          {
            id: 'dispatch-sqs-target',
            arn: queueArn,
            input: {
              type: 'SEND_DISPATCH',
              // data: { ...dto, dispatchId: dispatch.id },
              data: pushPayload,
            },
          },
        ],
        description: `학교에서 예약 발송건 등록 -> 발송 ID: ${dispatch.id}`,
      });

      this.logger.log(
        `Scheduled dispatch ${dispatch.id} with rule ${ruleName}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to schedule dispatch ${dispatch.id}: ${error.message}`,
      );
      throw error;
    }
  }
}
