import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { School } from '../school/entities/school.entity';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { Term } from '../term/entities/term.entity';
// import { NotificationPlatform, TargetGroup } from 'src/common/enums';
// import { Student } from '../student/entities/student.entity';
// import { Sam } from '../sam/entities/sam.entity';
import { InjectModel, Model } from 'nestjs-dynamoose';
import {
  INotification,
  INotificationKey,
} from './entities/notification.interface';
// import { batchPutHelper } from 'src/helpers/dynamo-batch-put.util';
import { AWS_SQS_CLIENT } from 'src/common/constants';
import { SqsService } from 'src/services/aws/sqs.service';
import { Phone } from '../phone/entities/phone.entity';
import { EventBridgeService } from 'src/services/aws/event-bridge.service';
import { ConfigService } from '@nestjs/config';
// import { Student } from '../student/entities/student.entity';
// import { Sam } from '../sam/entities/sam.entity';
// import { NotificationPlatform, TargetGroup } from 'src/common/enums';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectModel('Notification')
    private readonly model: Model<INotification, INotificationKey>,
    @Inject(AWS_SQS_CLIENT)
    private readonly sqsClient: SqsService,
    private readonly eventBridgeService: EventBridgeService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//
  async create(dto: CreateNotificationDto) {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      // 1. 학교 존재 여부 확인
      const school = await manager.findOne(School, {
        where: { id: dto.schoolId },
      });

      if (!school) {
        throw new NotFoundException(HttpErrorConstants.NOT_FOUND_SCHOOL);
      }

      // 2. 학기 존재 여부 확인
      const term = await manager.findOne(Term, {
        where: { id: dto.termId },
      });

      if (!term) {
        throw new NotFoundException(HttpErrorConstants.NOT_FOUND_TERM);
      }

      // 3. 학교의 대표 발신번호 등록 여부 확인
      const schoolPhone = await manager.findOne(Phone, {
        where: {
          schoolId: dto.schoolId,
          isActive: true,
        },
      });

      if (!schoolPhone) {
        throw new NotFoundException(
          HttpErrorConstants.NOT_FOUND_PHONE_IN_SCHOOL,
        );
      }

      // 3. 발송 정보 생성
      const notification = manager.create(Notification, dto);
      const savedNotification = await manager.save(notification);

      // 5. SQS 또는 EventBridge 처리
      const notificationData = {
        schoolId: dto.schoolId,
        termId: dto.termId,
        title: dto.title,
        body: dto.body,
        notificationType: dto.notificationType,
        target: dto.target,
        targetGroup: dto.targetGroup,
        reservationDate: dto.reservationDate,
        targetIds: dto.targetIds,
      };

      if (dto.reservationDate) {
        // 예약 시간이 있으면 EventBridge Rule 생성
        const ruleName = `NotificationRule-${savedNotification.id}-${Date.now()}`;
        const lambdaArn =
          'arn:aws:lambda:ap-northeast-2:000000000000:function:lambda-function';

        console.log('예약시간 ', dto.reservationDate.toISOString());

        await this.eventBridgeService.createScheduledRule(
          ruleName,
          dto.reservationDate.toISOString(), // KST 기준, 예: "2025-06-05T14:30:00+09:00"
          lambdaArn,
          notificationData,
        );
      } else {
        // 예약 시간이 없으면 즉시 SQS로 전송
        await this.sqsClient.sendMessage({
          type: 'SEND_NOTIFICATION',
          data: notificationData,
        });
      }

      // // 4. SQS 발송 대기 큐 등록
      // await this.sqsClient.sendMessage({
      //   type: 'SEND_NOTIFICATION',
      //   data: {
      //     schoolId: dto.schoolId,
      //     termId: dto.termId,
      //     title: dto.title,
      //     body: dto.body,
      //     notificationType: dto.notificationType,
      //     target: dto.target,
      //     targetGroup: dto.targetGroup,
      //     reservationDate: dto.reservationDate,
      //     targetIds: dto.targetIds,
      //   },
      // });

      // // 4. 발송 대상자 조회
      // const target = dto.targetGroup;
      // let targetInfo: Student[] | Sam[] = [];

      // if (target === TargetGroup.STUDENT) {
      //   targetInfo = await manager.find(Student, {
      //     where: {
      //       id: In(dto.targetIds),
      //     },
      //     relations: {
      //       parent: true,
      //     },
      //     select: {
      //       id: true,
      //       parent: {
      //         userId: true,
      //         phone: true,
      //         pushToken: true,
      //       },
      //     },
      //   });
      // } else if (target === TargetGroup.SAM) {
      //   targetInfo = await manager.find(Sam, {
      //     where: {
      //       id: In(dto.targetIds),
      //     },
      //     relations: {
      //       instructor: true,
      //     },
      //     select: {
      //       id: true,
      //       instructor: {
      //         userId: true,
      //         phone: true,
      //         pushToken: true,
      //       },
      //     },
      //   });
      // }

      // // 5. 발송 대상자 정보 매핑
      // const mappingTarget = targetInfo.map((target) => ({
      //   notificationKey: `${dto.notificationType}#${savedNotification.id}`,
      //   targetKey:
      //     dto.targetGroup === TargetGroup.STUDENT
      //       ? `SCHOOL#${dto.schoolId}#STUDENT#${target.id}`
      //       : `SCHOOL#${dto.schoolId}#SAM#${target.id}`,
      //   notificationId: savedNotification.id,
      //   targetId: target.id,
      //   type: dto.notificationType,
      //   phone: target.parent?.phone ?? target.instructor?.phone,
      //   platform:
      //     (dto.targetGroup === TargetGroup.STUDENT && target.parent?.userId) ||
      //     (dto.targetGroup === TargetGroup.SAM && target.instructor?.userId)
      //       ? NotificationPlatform.FCM
      //       : NotificationPlatform.SMS,
      // }));

      // // 6. SMS, FCM 발송 대상자 정보 매핑
      // const mappingSMS = mappingTarget
      //   .filter((target) => target.platform === NotificationPlatform.SMS)
      //   .map((target) => ({
      //     sender: schoolPhone.phone,
      //     message: {
      //       receiver: target.phone,
      //       content: dto.title,
      //     },
      //     msg_type: 'SMS',
      //     dryrun: true,
      //   }));

      // const mappingFCM = mappingTarget
      //   .filter((target) => target.platform === NotificationPlatform.FCM)
      //   .map((target) => ({}));

      // // 6. dynamoDB로 발송 대상자 Chunk 단위로 Batch Update
      // await batchPutHelper(this.model, mappingTarget);

      return savedNotification;
    });
  }

  findAll() {
    return `This action returns all notification`;
  }

  findOne(id: number) {
    return `This action returns a #${id} notification`;
  }

  update(id: number, updateNotificationDto: UpdateNotificationDto) {
    return `This action updates a #${id} notification`;
  }

  remove(id: number) {
    return `This action removes a #${id} notification`;
  }
}
