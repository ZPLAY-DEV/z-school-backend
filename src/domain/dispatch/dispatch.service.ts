import { Injectable, Logger } from '@nestjs/common';
import { CreateDispatchDto } from './dto/create-dispatch.dto';
import { Dispatch } from './entities/dispatch.entity';
import { TargetGroup } from 'src/common/enums';
import { DispatchCoreService } from './dispatch-core.service';
@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(private readonly dispatchCoreService: DispatchCoreService) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//
  async create(dto: CreateDispatchDto): Promise<Dispatch> {
    if (dto.targetGroup === TargetGroup.STUDENT) {
      return await this.dispatchCoreService.createParentDispatch(dto);
    } else {
      return await this.dispatchCoreService.createInstructorDispatch(dto);
    }
  }
  // // 강사 & 학부모(학생) 기준으로 구분
  // return await this.dataSource.transaction(async (manager: EntityManager) => {
  //   // 1. 학교 존재 여부 확인
  //   const school = await manager.findOne(School, {
  //     where: { id: dto.schoolId },
  //   });
  //   if (!school) {
  //     throw new NotFoundException(HttpErrorConstants.NOT_FOUND_SCHOOL);
  //   }
  //   // 2. 학기 존재 여부 확인
  //   const term = await manager.findOne(Term, {
  //     where: { id: dto.termId },
  //   });
  //   if (!term) {
  //     throw new NotFoundException(HttpErrorConstants.NOT_FOUND_TERM);
  //   }
  //   // 3. 학교의 대표 발신번호 등록 여부 확인
  //   const schoolPhone = await manager.findOne(Phone, {
  //     where: {
  //       schoolId: dto.schoolId,
  //       isActive: true,
  //     },
  //   });
  //   if (
  //     !schoolPhone &&
  //     dto.targetGroup === TargetGroup.STUDENT &&
  //     dto.mode !== DispatchMode.DRAFT
  //   ) {
  //     // 학교에 등록된 발신번호가 존재하지 않고, TargetGroup이 학생인 경우 예외 발생(단, 발송 유형이 (Draft)일 경우는 Pass)
  //     throw new NotFoundException(
  //       HttpErrorConstants.NOT_FOUND_PHONE_IN_SCHOOL,
  //     );
  //   }
  //   // 4. 발송 정보 생성
  //   const dispatch = manager.create(Dispatch, dto);
  //   const saveDispatch = await manager.save(dispatch);
  //   /**
  //    * 5. Created NanoId with shortyURL
  //    *  - TargetGroup이 Student일 경우
  //    *    - SMS/FCM Mixed 발송
  //    *    - dispatch_read 테이블에 값 할당
  //    * - TargetGroup이 Instructor일 경우
  //    *    - FCM만 발송
  //    *    - dispatch_read 테이블에 값 할당 X
  //    * */
  //   if (dto.targetGroup === TargetGroup.STUDENT) {
  //     // TargeGroup 이 Student 인 경우에만 필터링
  //     const studentIds = dto.targetIds.filter((id) => {
  //       if (dto.targetGroup === TargetGroup.STUDENT) {
  //         return id;
  //       }
  //     });
  //     // 학부모 정보 조회 ( id, pushToken, phone )
  //     const findParentIds = await manager.find(Student, {
  //       where: { id: In(studentIds) },
  //       select: {
  //         parent: {
  //           id: true,
  //           phone: true,
  //           pushToken: true,
  //         },
  //       },
  //       relations: {
  //         parent: true,
  //       },
  //     });
  //     console.log('findParentIds -->', findParentIds);
  //     // nanoId 생성 ( 중첩을 제외한 학부모 Id에 해당하는 NanoId를 생성 )
  //     // dispatch_read 테이블에 값 할당
  //   }
  //   // 6. Redis key: (dispatchId + studentId), value: count -> bulk redis insert
  //   if (
  //     dto.targetGroup === TargetGroup.STUDENT &&
  //     dto.mode !== DispatchMode.DRAFT
  //   ) {
  //     const keyValuePairs: Record<string, string> = {};
  //     const dispatchId = saveDispatch.id;
  //     dto.targetIds.forEach((studentId) => {
  //       keyValuePairs[`dispatch:${dispatchId}:student:${studentId}`] = '0';
  //     });
  //     await this.redisDispatchService.initStudentReadStatus(keyValuePairs);
  //   }
  //   // 7. 발송 유형에 맞는 이벤트 발송
  //   switch (dto.mode) {
  //     //? SQS 발송건 전달
  //     case DispatchMode.IMMEDIATE:
  //       await this.sqsClient.sendMessage({
  //         type: 'SEND_DISPATCH',
  //         data: dto,
  //       });
  //       break;
  //     //? EventBridge 예약 이벤트 등록
  //     case DispatchMode.SCHEDULED:
  //       await this.scheduleDispatch(dto, saveDispatch);
  //       break;
  //     //? 발송X, 등록만 진행
  //     case DispatchMode.DRAFT:
  //       break;
  //   }
  //   return saveDispatch;
  // });
  // }

  // private async scheduleDispatch(dto: CreateDispatchDto, dispatch: Dispatch) {
  //   if (!dto.reservationDate) {
  //     throw new Error('Reservation date is required for scheduled dispatch');
  //   }

  //   const ruleName = `DispatchRule-${dispatch.id}-${Date.now()}`;
  //   const queueArn =
  //     process.env.AWS_SQS_ARN || 'arn:aws:sqs:ap-northeast-2:000000000000:main';

  //   try {
  //     const result = await this.schedulerService.schedule({
  //       ruleName,
  //       scheduleTime: dto.reservationDate,
  //       targets: [
  //         {
  //           id: 'dispatch-sqs-target',
  //           arn: queueArn,
  //           input: {
  //             type: 'SEND_DISPATCH',
  //             data: { ...dto, dispatchId: dispatch.id },
  //           },
  //         },
  //       ],
  //       description: `학교에서 예약 발송건 등록 -> 발송 ID: ${dispatch.id}`,
  //     });

  //     this.logger.log(
  //       `Scheduled dispatch ${dispatch.id} with rule ${ruleName}`,
  //     );
  //     return result;
  //   } catch (error) {
  //     this.logger.error(
  //       `Failed to schedule dispatch ${dispatch.id}: ${error.message}`,
  //     );
  //     throw error;
  //   }
  // }

  // //?  예약 발송건 처리 -> eventBridge -> Lambda 예약 이벤트 등록
  // private async scheduleDispatch(dto: CreateDispatchDto, dispatch: Dispatch) {
  //   if (!dto.reservationDate) {
  //     throw new Error('Reservation date is required for scheduled dispatch');
  //   }

  //   const ruleName = `DispatchRule-${dispatch.id}-${Date.now()}`;
  //   //? Lambda 함수는 1개로 통일한다고 했기 때문에 lambda-function으로 고정 !추후 네이밍이나 람다 함수를 여러개 쓸 경우 Symbol로 관리
  //   const lambdaArn =
  //     process.env.AWS_LAMBDA_ARN ||
  //     'arn:aws:lambda:ap-northeast-2:000000000000:function:lambda-function';

  //   try {
  //     const result = await this.schedulerService.schedule({
  //       ruleName,
  //       scheduleTime: dto.reservationDate,
  //       targets: [
  //         {
  //           id: 'dispatch-lambda-target',
  //           arn: lambdaArn,
  //           input: { ...dto, dispatchId: dispatch.id },
  //         },
  //       ],
  //       description: `학교에서 예약 발송건 등록 -> 발송 ID: ${dispatch.id}`,
  //     });

  //     this.logger.log(
  //       `Scheduled dispatch ${dispatch.id} with rule ${ruleName}`,
  //     );
  //     return result;
  //   } catch (error) {
  //     this.logger.error(
  //       `Failed to schedule dispatch ${dispatch.id}: ${error.message}`,
  //     );
  //     throw error;
  //   }
  // }
}
