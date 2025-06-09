import { Injectable, Logger } from '@nestjs/common';
import { formatInTimeZone } from 'date-fns-tz';
import { MessageType } from 'src/common/enums/message-type';
import { IFcmData } from 'src/common/interfaces';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { AligoService } from 'src/services/aligo/aligo-service';
import { FirehoseService } from 'src/services/aws/firehose.service';
import { FcmService } from 'src/services/fcm/fcm.service';
import {
  BroadcastMessageRequest,
  NotificationResult,
  PersonalizedMessage,
  PersonalizedMessagesRequest,
} from 'src/services/notification/types';
import { DataSource, In, Repository } from 'typeorm';

interface INotifiableTarget {
  id: number;
  pushToken?: string | null;
  phone?: string | null;
}

interface NotificationCounts {
  fcmSuccess: number;
  fcmFailure: number;
  smsSuccess: number;
  smsFailure: number;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly instructorRepository: Repository<Instructor>;
  private readonly parentRepository: Repository<Parent>;
  private readonly schoolRepository: Repository<School>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly fcmService: FcmService,
    private readonly aligoService: AligoService,
    private readonly firehoseService: FirehoseService,
  ) {
    this.instructorRepository = this.dataSource.getRepository(Instructor);
    this.parentRepository = this.dataSource.getRepository(Parent);
    this.schoolRepository = this.dataSource.getRepository(School);
  }

  //? ---------------------------------------------------------------------- ?//
  //? 학부모에게 발송
  //? ---------------------------------------------------------------------- ?//

  /**
   * Parent 메시지 발송 (FCM + SMS Fallback)
   * @param params
   * @returns
   */
  async sendMessageToParent(
    params: PersonalizedMessage & {
      messageType: string;
      role: string;
      schoolId: number;
    },
  ): Promise<void> {
    const parent = await this.parentRepository.findOneOrFail({
      where: { id: params.id },
      relations: ['user'],
    });

    const school = await this.schoolRepository.findOneOrFail({
      where: { id: params.schoolId },
    });

    const counts: NotificationCounts = {
      fcmSuccess: 0,
      fcmFailure: 0,
      smsSuccess: 0,
      smsFailure: 0,
    };

    const hasPushToken = parent.user?.pushToken?.trim();
    let fcmSent = false;

    // Try FCM first
    if (hasPushToken) {
      const fcmData: IFcmData = {
        ...(params.target && { page: params.target }),
        args: JSON.stringify({
          role: 'PARENT',
          ...(params.targetArgs && { targetArgs: params.targetArgs }),
        }),
      };

      try {
        await this.fcmService.sendToToken({
          token: parent.user!.pushToken!,
          notification: {
            title: params.title,
            body: params.body,
          },
          data: fcmData,
        });

        counts.fcmSuccess++;
        fcmSent = true;
        this.logger.log(`FCM message sent successfully to parent ${parent.id}`);
      } catch (error) {
        counts.fcmFailure++;
        this.logger.error(`Failed to send FCM to parent ${parent.id}`, error);
      }
    }

    // SMS fallback (if FCM failed or no push token)
    if (!fcmSent) {
      const hasPhone = parent.phone?.trim();
      const senderPhone = school.phone;
      const senderAllowed = school.messageType !== MessageType.SMS;

      if (hasPhone && senderPhone && senderAllowed) {
        const message = params.title
          ? `[${params.title}] ${params.body}`
          : params.body;

        try {
          await this.aligoService.send({
            sender: senderPhone,
            receiver: parent.phone,
            msg: message,
            msg_type: 'SMS',
            testmode_yn: process.env.NODE_ENV === 'production' ? 'N' : 'Y',
          });

          counts.smsSuccess++;
          this.logger.log(
            `SMS message sent successfully to parent ${parent.id}`,
          );
        } catch (error) {
          counts.smsFailure++;
          this.logger.error(`Failed to send SMS to parent ${parent.id}`, error);
        }
      } else {
        counts.smsFailure++;
        this.logger.warn(
          `Parent ${parent.id} SMS not available - phone: ${!!hasPhone}, sender: ${!!senderPhone}, allowed: ${senderAllowed}`,
        );
      }
    }

    this.logNotificationSummary('Parent 개별발송', counts);

    // Log to Firehose
    await this.logToFirehose({
      messageType: params.messageType,
      schoolId: params.schoolId,
      schoolName: school.name!,
      title: `Parent 개별발송`,
      body: params.body,
      ids: [parent.id],
      role: params.role,
      fcmSuccessCount: counts.fcmSuccess,
      fcmFailureCount: counts.fcmFailure,
      smsSuccessCount: counts.smsSuccess,
      smsFailureCount: counts.smsFailure,
    });
  }

  /**
   * Parents 동일메시지 대량발송
   * @param params
   * @returns
   */
  async broadcastMessageToParents(
    params: BroadcastMessageRequest,
  ): Promise<void> {
    const parents = await this.parentRepository.find({
      where: { id: In(params.ids) },
      relations: ['user'],
    });
    const school = await this.schoolRepository.findOneOrFail({
      where: { id: params.schoolId },
    });
    const targets: INotifiableTarget[] = parents.map((parent) => ({
      id: parent.id,
      pushToken: parent.user?.pushToken,
      phone: parent.phone, //! 가입안한 학부모가 있을 수 있으므로 항상 parent.phone 사용할것.
    }));

    await this.processBroadcasting(params, targets, school);
  }

  /**
   * Parents 개별메시지 대량발송
   * @param params
   * @returns
   */
  async sendMessagesToParents(
    params: PersonalizedMessagesRequest,
  ): Promise<void> {
    const parentIds = params.notifications.map((n) => n.id);
    const parents = await this.parentRepository.find({
      where: { id: In(parentIds) },
      relations: ['user'],
    });
    const school = await this.schoolRepository.findOneOrFail({
      where: { id: params.schoolId },
    });

    const targets: INotifiableTarget[] = parents.map((parent) => ({
      id: parent.id,
      pushToken: parent.user?.pushToken,
      phone: parent.phone, //! 가입안한 학부모가 있을 수 있으므로 항상 parent.phone 사용할것.
    }));

    await this.processSendingMessages(params, targets, school);
  }

  //? ---------------------------------------------------------------------- ?//
  //? 강사에게 발송
  //? ---------------------------------------------------------------------- ?//

  /**
   * Instructor 메시지 발송 (FCM Only)
   * @param params
   * @returns
   */
  async sendMessageToInstructorUsingFCM(
    params: PersonalizedMessage,
  ): Promise<void> {
    const instructor = await this.instructorRepository.findOneOrFail({
      where: { id: params.id },
      relations: ['user'],
    });

    if (!instructor.user?.pushToken?.trim()) {
      this.logger.warn(`Instructor ${instructor.id} has no push token`);
      return;
    }

    const fcmData: IFcmData = {
      ...(params.target && { page: params.target }),
      args: JSON.stringify({
        role: 'INSTRUCTOR',
        ...(params.targetArgs && { targetArgs: params.targetArgs }),
      }),
    };

    try {
      await this.fcmService.sendToToken({
        token: instructor.user.pushToken,
        notification: {
          title: params.title,
          body: params.body,
        },
        data: fcmData,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send message to instructor ${instructor.id}`,
        error,
      );
    }
  }

  /**
   * Instructors 동일메시지 대량발송 (FCM Only)
   * @param params
   * @returns
   */
  async broadcastMessageToInstructorsUsingFCM(
    params: BroadcastMessageRequest,
  ): Promise<void> {
    const instructors = await this.instructorRepository.find({
      where: { id: In(params.ids) },
      relations: ['user'],
    });
    const targets: INotifiableTarget[] = instructors.map((instructor) => ({
      id: instructor.id,
      pushToken: instructor.user?.pushToken,
      phone: null, // instructors don't need SMS
    }));

    await this.processBroadcastingFcmOnly(params, targets);
  }

  /**
   * Instructors 개별메시지 대량발송 (FCM Only)
   * @param params
   * @returns
   */
  async sendMessagesToInstructorsUsingFCM(
    params: PersonalizedMessagesRequest,
  ): Promise<void> {
    const instructorIds = params.notifications.map((n) => n.id);
    const instructors = await this.instructorRepository.find({
      where: { id: In(instructorIds) },
      relations: ['user'],
    });

    const targets: INotifiableTarget[] = instructors.map((instructor) => ({
      id: instructor.id,
      pushToken: instructor.user?.pushToken,
      phone: null, // instructors don't need SMS
    }));

    await this.processSendingMessagesFcmOnly(params, targets);
  }

  //? ---------------------------------------------------------------------- ?//
  //? 동일메시지 대량발송 (SMS + FCM)
  //? ---------------------------------------------------------------------- ?//

  private async processBroadcasting(
    params: BroadcastMessageRequest,
    targets: INotifiableTarget[],
    school: School,
  ): Promise<void> {
    const { title, body, role, target, targetArgs } = params;
    const senderPhone = school.phone;
    const senderAllowed = school.messageType !== MessageType.SMS;
    const counts: NotificationCounts = {
      fcmSuccess: 0,
      fcmFailure: 0,
      smsSuccess: 0,
      smsFailure: 0,
    };

    // Prepare FCM and SMS targets
    const fcmTargets: string[] = [];
    const smsTargets: { phone: string; body: string }[] = [];

    for (const target of targets) {
      const hasPushToken = target.pushToken?.trim();
      const hasPhone = target.phone?.trim();

      if (hasPushToken) {
        fcmTargets.push(target.pushToken!);
      } else if (hasPhone && senderPhone && senderAllowed) {
        const message = title ? `[${title}] ${body}` : body;
        smsTargets.push({
          phone: target.phone!,
          body: message,
        });
      } else {
        counts.smsFailure++; // 전화번호 없거나 발송하지 말라고 설정한 경우
      }
    }

    if (fcmTargets.length > 0) {
      await this.sendBulkFcmUsingMulticast(
        fcmTargets,
        { title, body },
        role,
        counts,
        target,
        targetArgs,
      );
    }
    if (smsTargets.length > 0) {
      await this.sendBulkSms(smsTargets, counts, senderPhone);
    }

    this.logNotificationSummary('Parents 동일대량', counts);

    await this.logToFirehose({
      messageType: params.messageType,
      schoolId: params.schoolId,
      schoolName: school.name!,
      title: `동일대량 ${targets.length}개`,
      body: params.body,
      ids: targets.map((t) => t.id),
      role: params.role,
      fcmSuccessCount: counts.fcmSuccess,
      fcmFailureCount: counts.fcmFailure,
      smsSuccessCount: counts.smsSuccess,
      smsFailureCount: counts.smsFailure,
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? 개별메시지 대량발송 (SMS + FCM)
  //? ---------------------------------------------------------------------- ?//

  private async processSendingMessages(
    params: PersonalizedMessagesRequest,
    targets: INotifiableTarget[],
    school: School,
  ): Promise<void> {
    const { notifications, role } = params;
    const senderPhone = school.phone;
    const senderAllowed = school.messageType !== MessageType.SMS;
    const counts: NotificationCounts = {
      fcmSuccess: 0,
      fcmFailure: 0,
      smsSuccess: 0,
      smsFailure: 0,
    };

    // Prepare FCM and SMS targets
    const fcmTargets: { token: string; notification: any }[] = [];
    const smsTargets: { phone: string; body: string }[] = [];

    for (const notification of notifications) {
      const target = targets.find((t) => t.id === notification.id);
      if (!target) {
        this.logger.warn(`Target with ID ${notification.id} not found`);
        counts.fcmFailure++; // or smsFailure depending on preference
        continue;
      }

      const hasPushToken = target.pushToken?.trim();
      const hasPhone = target.phone?.trim();

      if (hasPushToken) {
        fcmTargets.push({
          token: target.pushToken!,
          notification,
        });
      } else if (hasPhone && senderPhone && senderAllowed) {
        const message = notification.title
          ? `[${notification.title}] ${notification.body}`
          : notification.body;

        smsTargets.push({
          phone: target.phone!,
          body: message,
        });
      } else {
        counts.smsFailure++; // 전화번호 없거나 발송하지 말라고 설정한 경우
      }
    }

    if (fcmTargets.length > 0) {
      await this.sendBulkFcmUsingToken(fcmTargets, role, counts);
    }
    if (smsTargets.length > 0) {
      await this.sendBulkSms(smsTargets, counts, senderPhone);
    }

    this.logNotificationSummary('Parents 개별대량', counts);

    await this.logToFirehose({
      messageType: params.messageType,
      schoolId: params.schoolId,
      schoolName: school.name!,
      title: `개별대량 ${targets.length}개`,
      body: `${params.notifications[0].body}`,
      ids: targets.map((t) => t.id),
      role: params.role,
      fcmSuccessCount: counts.fcmSuccess,
      fcmFailureCount: counts.fcmFailure,
      smsSuccessCount: counts.smsSuccess,
      smsFailureCount: counts.smsFailure,
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? 동일메시지 대량발송 (FCM Only)
  //? ---------------------------------------------------------------------- ?//

  private async processBroadcastingFcmOnly(
    params: BroadcastMessageRequest,
    targets: INotifiableTarget[],
  ): Promise<void> {
    const { title, body, role, target, targetArgs } = params;
    const counts: NotificationCounts = {
      fcmSuccess: 0,
      fcmFailure: 0,
      smsSuccess: 0,
      smsFailure: 0,
    };

    // Prepare FCM targets only
    const fcmTargets: string[] = [];

    for (const targetItem of targets) {
      const hasPushToken = targetItem.pushToken?.trim();

      if (hasPushToken) {
        fcmTargets.push(targetItem.pushToken!);
      } else {
        counts.fcmFailure++; // No push token available
      }
    }

    if (fcmTargets.length > 0) {
      await this.sendBulkFcmUsingMulticast(
        fcmTargets,
        { title, body },
        role,
        counts,
        target,
        targetArgs,
      );
    }

    this.logNotificationSummary('Instructors 동일대량 (FCM)', counts);

    // await this.logToFirehose({
    //   messageType: params.messageType,
    //   schoolId: params.schoolId,
    //   schoolName: school.name!,
    //   title: `동일대량 (FCM) ${targets.length}개`,
    //   body: params.body,
    //   ids: targets.map((t) => t.id),
    //   role: params.role,
    //   fcmSuccessCount: counts.fcmSuccess,
    //   fcmFailureCount: counts.fcmFailure,
    //   smsSuccessCount: counts.smsSuccess,
    //   smsFailureCount: counts.smsFailure,
    // });
  }

  //? ---------------------------------------------------------------------- ?//
  //? 개별메시지 대량발송 (FCM Only)
  //? ---------------------------------------------------------------------- ?//

  private async processSendingMessagesFcmOnly(
    params: PersonalizedMessagesRequest,
    targets: INotifiableTarget[],
  ): Promise<void> {
    const { notifications, role } = params;
    const counts: NotificationCounts = {
      fcmSuccess: 0,
      fcmFailure: 0,
      smsSuccess: 0,
      smsFailure: 0,
    };

    // Prepare FCM targets only
    const fcmTargets: { token: string; notification: any }[] = [];

    for (const notification of notifications) {
      const target = targets.find((t) => t.id === notification.id);
      if (!target) {
        this.logger.warn(`Target with ID ${notification.id} not found`);
        counts.fcmFailure++;
        continue;
      }

      const hasPushToken = target.pushToken?.trim();

      if (hasPushToken) {
        fcmTargets.push({
          token: target.pushToken!,
          notification,
        });
      } else {
        counts.fcmFailure++; // No push token available
      }
    }

    if (fcmTargets.length > 0) {
      await this.sendBulkFcmUsingToken(fcmTargets, role, counts);
    }

    this.logNotificationSummary('Instructors 개별대량 (FCM)', counts);

    // await this.logToFirehose({
    //   messageType: params.messageType,
    //   schoolId: params.schoolId,
    //   schoolName: school.name!,
    //   title: `개별대량 (FCM) ${targets.length}개`,
    //   body: `${params.notifications[0].body}`,
    //   ids: targets.map((t) => t.id),
    //   role: params.role,
    //   fcmSuccessCount: counts.fcmSuccess,
    //   fcmFailureCount: counts.fcmFailure,
    //   smsSuccessCount: counts.smsSuccess,
    //   smsFailureCount: counts.smsFailure,
    // });
  }

  //? ---------------------------------------------------------------------- ?//
  //? 나머지 private 함수들
  //? ---------------------------------------------------------------------- ?//

  /**
   * FCM 대량발송 (sendMulticast)
   */
  private async sendBulkFcmUsingMulticast(
    tokens: string[],
    notification: { title?: string; body: string },
    role: string,
    counts: NotificationCounts,
    target?: string,
    targetArgs?: string,
  ): Promise<void> {
    const fcmData: IFcmData = {
      ...(target && { page: target }),
      args: JSON.stringify({
        role,
        ...(targetArgs && { targetArgs }),
      }),
    };

    try {
      const result = await this.fcmService.sendMulticast(
        tokens,
        notification,
        fcmData,
      );

      counts.fcmSuccess += result.successCount;
      counts.fcmFailure += result.failureCount;

      this.logger.log(
        `sendBulkFcm - Success: ${result.successCount}, Failure: ${result.failureCount}`,
      );
    } catch (error) {
      this.logger.error('Failed to send FCM bulk notifications', error);
      counts.fcmFailure += tokens.length;
    }
  }

  /**
   * FCM 대량발송 (sendToToken)
   */
  private async sendBulkFcmUsingToken(
    fcmTargets: { token: string; notification: any }[],
    role: string,
    counts: NotificationCounts,
  ): Promise<void> {
    // Send FCM notifications in parallel for better performance
    const fcmPromises = fcmTargets.map(async (fcmTarget) => {
      const fcmData: IFcmData = {
        ...(fcmTarget.notification.target && {
          page: fcmTarget.notification.target,
        }),
        args: JSON.stringify({
          role,
          ...(fcmTarget.notification.targetArgs && {
            targetArgs: fcmTarget.notification.targetArgs,
          }),
        }),
      };

      try {
        await this.fcmService.sendToToken({
          token: fcmTarget.token,
          notification: {
            title: fcmTarget.notification.title,
            body: fcmTarget.notification.body,
          },
          data: fcmData,
        });
        return { success: true };
      } catch (error) {
        this.logger.error(`Failed to send FCM notification`, error);
        return { success: false };
      }
    });

    const results = await Promise.allSettled(fcmPromises);

    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.success) {
        counts.fcmSuccess++;
      } else {
        counts.fcmFailure++;
      }
    });

    this.logger.log(
      `sendBulkFcmUsingToken - Success: ${counts.fcmSuccess}, Failure: ${counts.fcmFailure}`,
    );
  }

  /**
   * SMS 대량발송 (sendBulkWrapper)
   */
  private async sendBulkSms(
    smsTargets: { phone: string; body: string }[],
    counts: NotificationCounts,
    senderPhone?: string,
  ): Promise<void> {
    if (!senderPhone) {
      this.logger.warn(
        `${smsTargets.length} SMS targets found but no senderPhone provided`,
      );
      counts.smsFailure += smsTargets.length;
      return;
    }

    try {
      const result = await this.aligoService.sendBulkWrapper(
        {
          sender: senderPhone,
          msg_type: 'SMS',
          cnt: smsTargets.length,
          testmode_yn: process.env.NODE_ENV === 'production' ? 'N' : 'Y',
        },
        smsTargets,
      );

      counts.smsSuccess += result.successCount;
      counts.smsFailure += result.failureCount;

      this.logger.log(
        `sendBulkSms - Success: ${result.successCount}, Failure: ${result.failureCount}`,
      );
    } catch (error) {
      this.logger.error('Failed to send SMS notifications', error);
      counts.smsFailure += smsTargets.length;
    }
  }

  /**
   * 마지막 로그 출력
   */
  private logNotificationSummary(
    type: string,
    counts: NotificationCounts,
  ): void {
    const totalFcm = counts.fcmSuccess + counts.fcmFailure;
    const totalSms = counts.smsSuccess + counts.smsFailure;

    this.logger.log(
      `${type} notification summary - FCM: ${counts.fcmSuccess}/${totalFcm}, SMS: ${counts.smsSuccess}/${totalSms}`,
    );
  }

  /**
   * 성공률 계산 (백분율)
   */
  private calculateSuccessRate(
    successCount: number,
    totalCount: number,
  ): number {
    if (totalCount === 0) return 0;
    return Math.round((successCount / totalCount) * 100);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Firehose 로그 전송
  //? ---------------------------------------------------------------------- ?//

  private async logToFirehose(logData: {
    messageType: string;
    schoolId: number;
    schoolName: string;
    title?: string;
    body: string;
    ids: number[]; // could be userIds or parentIds
    role: string;
    fcmSuccessCount?: number;
    fcmFailureCount?: number;
    smsSuccessCount?: number;
    smsFailureCount?: number;
  }): Promise<NotificationResult> {
    try {
      const now = new Date();
      const seoulTimeZone = 'Asia/Seoul';

      // 🎯 parent 로그만 저장하도록 필터링
      if (logData.role !== 'PARENT') {
        this.logger.log(
          `Skipping Firehose logging for role: ${logData.role} (only PARENT logs are stored)`,
        );
        return { success: true };
      }

      const partitionedLogData = {
        // 기본 로그 정보 (원본 필드명 제거하고 파티션 필드명으로 통일)
        type: logData.messageType, // 파티션 키
        school: logData.schoolId, // 파티션 키
        school_name: logData.schoolName,
        title: logData.title,
        body: logData.body,
        user_ids: logData.ids,
        role: 'PARENT', // 항상 PARENT로 고정 (일반 컬럼, 파티션 아님)

        // 시간 기반 파티션 키
        year: formatInTimeZone(now, seoulTimeZone, 'yyyy'),
        month: formatInTimeZone(now, seoulTimeZone, 'MM'),
        day: formatInTimeZone(now, seoulTimeZone, 'dd'),
        hour: formatInTimeZone(now, seoulTimeZone, 'HH'),

        // 성과 메트릭
        fcm_success_count: logData.fcmSuccessCount || 0,
        fcm_failure_count: logData.fcmFailureCount || 0,
        sms_success_count: logData.smsSuccessCount || 0,
        sms_failure_count: logData.smsFailureCount || 0,

        // 계산된 필드
        timestamp: formatInTimeZone(
          now,
          seoulTimeZone,
          "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
        ),
        total_users: logData.ids.length,
        total_success:
          (logData.fcmSuccessCount || 0) + (logData.smsSuccessCount || 0),
        total_failure:
          (logData.fcmFailureCount || 0) + (logData.smsFailureCount || 0),
        success_rate: this.calculateSuccessRate(
          (logData.fcmSuccessCount || 0) + (logData.smsSuccessCount || 0),
          logData.ids.length,
        ),
      };

      await this.firehoseService.sendRecord(partitionedLogData);
      this.logger.log(`A ${logData.messageType} log sent to Firehose`);

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to send log to Firehose', error);

      return { success: false, error: error as Error };
    }
  }
}
