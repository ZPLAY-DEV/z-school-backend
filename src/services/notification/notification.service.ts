import { Injectable, Logger } from '@nestjs/common';
import { formatInTimeZone } from 'date-fns-tz';
import { MessageType } from 'src/common/enums/message-type';
import { IFcmData } from 'src/common/interfaces';
import { School } from 'src/domain/school/entities/school.entity';
import { AligoService } from 'src/services/aligo/aligo-service';
import { FirehoseService } from 'src/services/aws/firehose.service';
import { FcmService } from 'src/services/fcm/fcm.service';
import {
  BroadcastFcmMessage,
  BroadcastSmsMessage,
  MultiFcmMessages,
  MultiMixedMessages,
  MultiSmsMessages,
  NotificationResult,
  SingleFcmMessage,
  SingleSmsMessage,
} from 'src/services/notification/types';
import { DataSource, Repository } from 'typeorm';

interface NotificationCounts {
  fcmSuccess: number;
  fcmFailure: number;
  smsSuccess: number;
  smsFailure: number;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly schoolRepository: Repository<School>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly fcmService: FcmService,
    private readonly aligoService: AligoService,
    private readonly firehoseService: FirehoseService,
  ) {
    this.schoolRepository = this.dataSource.getRepository(School);
  }

  //? ---------------------------------------------------------------------- ?//
  //? FCM 발송
  //? ---------------------------------------------------------------------- ?//

  /**
   * Parent 메시지 발송 (FCM + SMS Fallback)
   * @param params
   * @returns
   */
  async sendFcmMessage(params: SingleFcmMessage): Promise<void> {
    const school = await this.schoolRepository.findOneOrFail({
      where: { id: +params.school },
    });
    const counts: NotificationCounts = {
      fcmSuccess: 0,
      fcmFailure: 0,
      smsSuccess: 0,
      smsFailure: 0,
    };

    try {
      await this.fcmService.sendToToken({
        token: params.token,
        notification: {
          title: params.title,
          body: params.body,
        },
        data: {
          ...(params.target && { page: params.target }),
          args: JSON.stringify({
            role: 'PARENT',
            ...(params.targetArgs && { targetArgs: params.targetArgs }),
          }),
        },
      });
      counts.fcmSuccess++;
    } catch (error) {
      counts.fcmFailure++;
      this.logger.error(`Failed to send FCM`, error);
    }

    this.logNotificationSummary('sendFcmMessage', counts);

    if (params.role === 'PARENT') {
      // Log to Firehose
      await this.logToFirehose({
        type: params.type,
        school: +params.school,
        schoolName: school.name!,
        title: `FCM 개별발송`,
        body: params.body,
        ids: [params.id],
        role: params.role,
        fcmSuccessCount: counts.fcmSuccess,
        fcmFailureCount: counts.fcmFailure,
        smsSuccessCount: counts.smsSuccess,
        smsFailureCount: counts.smsFailure,
      });
    }
  }

  /**
   * Parents 동일메시지 대량발송 (FCM Only)
   * @param params
   * @returns
   */
  async broadcastFcmMessage(params: BroadcastFcmMessage): Promise<void> {
    const parentIds: number[] = params.tokenPairs.map((v) => v.id);
    const school = await this.schoolRepository.findOneOrFail({
      where: { id: +params.school },
    });

    const { title, body, role, target, targetArgs } = params;
    const counts: NotificationCounts = {
      fcmSuccess: 0,
      fcmFailure: 0,
      smsSuccess: 0,
      smsFailure: 0,
    };

    // FCM 대량발송 (sendMulticast)
    if (params.tokenPairs.length > 0) {
      const fcmData: IFcmData = {
        ...(target && { page: target }),
        args: JSON.stringify({
          role,
          ...(targetArgs && { targetArgs }),
        }),
      };

      try {
        const result = await this.fcmService.sendMulticast(
          params.tokenPairs.map((v) => v.token),
          { title, body },
          fcmData,
        );

        counts.fcmSuccess += result.successCount;
        counts.fcmFailure += result.failureCount;
      } catch (error) {
        this.logger.error('Failed to send FCM bulk notifications', error);
        counts.fcmFailure += params.tokenPairs.length;
      }
    }

    this.logNotificationSummary('broadcastFcmMessageToParents', counts);

    if (params.role === 'PARENT') {
      await this.logToFirehose({
        type: params.type,
        school: +params.school,
        schoolName: school.name!,
        title: `FCM 동일대량 ${params.tokenPairs.length}개`,
        body: params.body,
        ids: parentIds,
        role: params.role,
        fcmSuccessCount: counts.fcmSuccess,
        fcmFailureCount: counts.fcmFailure,
        smsSuccessCount: counts.smsSuccess,
        smsFailureCount: counts.smsFailure,
      });
    }
  }

  /**
   * Parents 개별메시지 대량발송 (FCM Only)
   * @param params
   * @returns
   */
  async sendFcmMessages(params: MultiFcmMessages): Promise<void> {
    const parentIds = params.messages.map((v) => v.id);
    const school = await this.schoolRepository.findOneOrFail({
      where: { id: +params.school },
    });

    const counts: NotificationCounts = {
      fcmSuccess: 0,
      fcmFailure: 0,
      smsSuccess: 0,
      smsFailure: 0,
    };

    // Filter valid messages with tokens
    const validMessages = params.messages.filter((message) => {
      const hasToken = message.token?.trim();
      if (!hasToken) {
        counts.fcmFailure++;
        return false;
      }
      return true;
    });

    // FCM 개별메시지 대량발송 (sendToToken)
    if (validMessages.length > 0) {
      const fcmPromises = validMessages.map(async (message) => {
        const data = {
          token: message.token,
          notification: {
            title: message.title,
            body: message.body,
          },
          data: {
            ...(message.target && { page: message.target }),
            args: JSON.stringify({
              role: message.role,
              ...(message.targetArgs && { targetArgs: message.targetArgs }),
            }),
          },
        };

        try {
          await this.fcmService.sendToToken(data);
          return { success: true };
        } catch (error) {
          this.logger.error(
            `Failed to send FCM notification to user ${message.id}`,
            error,
          );
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
        `sendFcmMessagesToParents - Success: ${counts.fcmSuccess}, Failure: ${counts.fcmFailure}`,
      );
    }

    this.logNotificationSummary('sendFcmMessagesToParents', counts);

    if (params.role === 'PARENT') {
      await this.logToFirehose({
        type: params.type,
        school: +params.school,
        schoolName: school.name!,
        title: `FCM 개별대량 ${params.messages.length}개`,
        body: `${params.messages[0]?.body || ''}`,
        ids: parentIds,
        role: params.role,
        fcmSuccessCount: counts.fcmSuccess,
        fcmFailureCount: counts.fcmFailure,
        smsSuccessCount: counts.smsSuccess,
        smsFailureCount: counts.smsFailure,
      });
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? SMS 발송
  //? ---------------------------------------------------------------------- ?//

  /**
   * Single SMS message 발송
   * @param params
   * @returns
   */
  async sendSmsMessage(params: SingleSmsMessage): Promise<void> {
    const school = await this.schoolRepository.findOneOrFail({
      where: { id: +params.school },
    });
    const phone = params.phone?.trim();
    const senderPhone = school.phone;
    const senderAllowed =
      school.messageType === MessageType.SMS ||
      school.messageType === MessageType.ALL;
    const counts: NotificationCounts = {
      fcmSuccess: 0,
      fcmFailure: 0,
      smsSuccess: 0,
      smsFailure: 0,
    };
    // 유효성 검사
    if (!phone) {
      this.logger.warn('No phone number provided for SMS sending');
      counts.smsFailure++;
      return;
    }

    if (!senderPhone || !senderAllowed) {
      this.logger.warn(
        'SMS sending not allowed or sender phone not configured',
      );
      counts.smsFailure++;
      return;
    }
    const message = params.title
      ? `[${params.title}] ${params.body}`
      : params.body;

    try {
      await this.aligoService.send({
        sender: senderPhone,
        receiver: phone,
        msg: message,
        msg_type: 'SMS',
        testmode_yn: process.env.NODE_ENV === 'production' ? 'N' : 'Y',
      });

      counts.smsSuccess++;
    } catch (error) {
      counts.smsFailure++;
      this.logger.error(`Failed to send SMS to ${phone}`, error);
    }

    this.logNotificationSummary('sendSmsMessage', counts);

    await this.logToFirehose({
      type: params.type,
      school: +params.school,
      schoolName: school.name!,
      title: `SMS 개별발송`,
      body: message,
      ids: [params.id],
      role: params.role,
      fcmSuccessCount: counts.fcmSuccess,
      fcmFailureCount: counts.fcmFailure,
      smsSuccessCount: counts.smsSuccess,
      smsFailureCount: counts.smsFailure,
    });
  }

  /**
   * SMS 동일메시지 대량발송
   * @param params
   * @returns
   */
  async broadcastSmsMessage(params: BroadcastSmsMessage): Promise<void> {
    const school = await this.schoolRepository.findOneOrFail({
      where: { id: +params.school },
    });

    const senderPhone = school.phone;
    const senderAllowed =
      school.messageType === MessageType.SMS ||
      school.messageType === MessageType.ALL;
    const counts: NotificationCounts = {
      fcmSuccess: 0,
      fcmFailure: 0,
      smsSuccess: 0,
      smsFailure: 0,
    };

    if (!senderPhone || !senderAllowed) {
      this.logger.warn(
        'SMS sending not allowed or sender phone not configured',
      );
      counts.smsFailure += params.phonePairs.length;
      return;
    }

    // 유효한 전화번호 필터링
    const validPhonePairs = params.phonePairs.filter((v) => v.phone?.trim());
    if (validPhonePairs.length === 0) {
      this.logger.warn('No valid phone numbers found for SMS broadcast');
      counts.smsFailure += params.phonePairs.length;
      return;
    }
    const message = params.title
      ? `[${params.title}] ${params.body}`
      : params.body;

    try {
      const result = await this.aligoService.sendBulkWrapper(
        {
          sender: senderPhone,
          msg_type: 'SMS',
          cnt: validPhonePairs.length,
          testmode_yn: process.env.NODE_ENV === 'production' ? 'N' : 'Y',
        },
        validPhonePairs.map((v) => ({
          phone: v.phone,
          body: message,
        })),
      );

      counts.smsSuccess += result.successCount;
      counts.smsFailure += result.failureCount;

      this.logger.log(
        `broadcastSmsMessage - Success: ${result.successCount}, Failure: ${result.failureCount}`,
      );
    } catch (error) {
      this.logger.error('Failed to send SMS notifications', error);
      counts.smsFailure += validPhonePairs.length;
    }

    this.logNotificationSummary('broadcastSmsMessage', counts);

    await this.logToFirehose({
      type: params.type,
      school: +params.school,
      schoolName: school.name!,
      title: `SMS 동일대량 ${params.phonePairs.length}개`,
      body: message,
      ids: validPhonePairs.map((v) => v.id),
      role: params.role,
      fcmSuccessCount: counts.fcmSuccess,
      fcmFailureCount: counts.fcmFailure,
      smsSuccessCount: counts.smsSuccess,
      smsFailureCount: counts.smsFailure,
    });
  }

  /**
   * SMS 개별메시지 대량발송
   * @param params
   * @returns
   */
  async sendSmsMessages(params: MultiSmsMessages): Promise<void> {
    const school = await this.schoolRepository.findOneOrFail({
      where: { id: +params.school },
    });

    const senderPhone = school.phone;
    const senderAllowed =
      school.messageType === MessageType.SMS ||
      school.messageType === MessageType.ALL;
    const counts: NotificationCounts = {
      fcmSuccess: 0,
      fcmFailure: 0,
      smsSuccess: 0,
      smsFailure: 0,
    };

    if (!senderPhone || !senderAllowed) {
      this.logger.warn(
        'SMS sending not allowed or sender phone not configured',
      );
      counts.smsFailure += params.messages.length;
      return;
    }

    // Filter valid messages with phones and construct SMS targets
    const validMessages = params.messages.filter((message) =>
      message.phone?.trim(),
    );
    if (validMessages.length === 0) {
      this.logger.warn('No valid phone numbers found for SMS sending');
      counts.smsFailure += params.messages.length;
      return;
    }

    const targets = validMessages.map((message) => ({
      phone: message.phone,
      body: message.title ? `[${message.title}] ${message.body}` : message.body,
    }));

    try {
      const result = await this.aligoService.sendBulkWrapper(
        {
          sender: senderPhone,
          msg_type: 'SMS',
          cnt: targets.length,
          testmode_yn: process.env.NODE_ENV === 'production' ? 'N' : 'Y',
        },
        targets,
      );

      counts.smsSuccess += result.successCount;
      counts.smsFailure += result.failureCount;

      this.logger.log(
        `sendSmsMessages - Success: ${result.successCount}, Failure: ${result.failureCount}`,
      );
    } catch (error) {
      this.logger.error('Failed to send SMS notifications', error);
      counts.smsFailure += validMessages.length;
    }

    this.logNotificationSummary('sendSmsMessages', counts);

    await this.logToFirehose({
      type: params.type,
      school: +params.school,
      schoolName: school.name!,
      title: `SMS 개별대량 ${params.messages.length}개`,
      body: `${params.messages[0]?.body || ''}`,
      ids: validMessages.map((v) => v.id),
      role: params.role,
      fcmSuccessCount: counts.fcmSuccess,
      fcmFailureCount: counts.fcmFailure,
      smsSuccessCount: counts.smsSuccess,
      smsFailureCount: counts.smsFailure,
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Mixed (FCM/SMS) 발송
  //? ---------------------------------------------------------------------- ?//

  /**
   * Mixed 개별메시지 대량발송 (FCM/SMS)
   * @param params
   * @returns
   */
  async sendMixedMessages(params: MultiMixedMessages): Promise<void> {
    const school = await this.schoolRepository.findOneOrFail({
      where: { id: +params.school },
    });

    const senderPhone = school.phone;
    const senderAllowed =
      school.messageType === MessageType.SMS ||
      school.messageType === MessageType.ALL;
    const counts: NotificationCounts = {
      fcmSuccess: 0,
      fcmFailure: 0,
      smsSuccess: 0,
      smsFailure: 0,
    };

    // Separate messages into FCM and SMS candidates
    const fcmCandidates = params.messages.filter((message) => {
      const hasValidToken = message.token?.trim();
      if (!hasValidToken) {
        return false;
      }
      return true;
    });

    const smsCandidates = params.messages.filter((message) => {
      const hasValidToken = message.token?.trim();
      const hasValidPhone = message.phone?.trim();
      // SMS candidate: no valid token but has valid phone
      return !hasValidToken && hasValidPhone;
    });

    // Count messages that fall into neither category as failures
    const invalidMessages = params.messages.filter((message) => {
      const hasValidToken = message.token?.trim();
      const hasValidPhone = message.phone?.trim();
      return !hasValidToken && !hasValidPhone;
    });
    counts.fcmFailure += invalidMessages.length;

    // Send FCM messages
    if (fcmCandidates.length > 0) {
      const fcmPromises = fcmCandidates.map(async (message) => {
        const data = {
          token: message.token!,
          notification: {
            title: message.title,
            body: message.body,
          },
          data: {
            ...(message.target && { page: message.target }),
            args: JSON.stringify({
              role: message.role,
              ...(message.targetArgs && { targetArgs: message.targetArgs }),
            }),
          },
        };

        try {
          await this.fcmService.sendToToken(data);
          return { success: true };
        } catch (error) {
          this.logger.error(
            `Failed to send FCM notification to user ${message.id}`,
            error,
          );
          return { success: false };
        }
      });

      const fcmResults = await Promise.allSettled(fcmPromises);

      fcmResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success) {
          counts.fcmSuccess++;
        } else {
          counts.fcmFailure++;
        }
      });
    }

    // Send SMS messages (only if sender is configured and allowed)
    if (smsCandidates.length > 0) {
      if (!senderPhone || !senderAllowed) {
        this.logger.warn(
          'SMS sending not allowed or sender phone not configured',
        );
        counts.smsFailure += smsCandidates.length;
      } else {
        const smsTargets = smsCandidates.map((message) => ({
          phone: message.phone!,
          body: message.title
            ? `[${message.title}] ${message.body}`
            : message.body,
        }));

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
            `sendMixedMessages SMS - Success: ${result.successCount}, Failure: ${result.failureCount}`,
          );
        } catch (error) {
          this.logger.error('Failed to send SMS notifications', error);
          counts.smsFailure += smsCandidates.length;
        }
      }
    }

    this.logNotificationSummary('sendMixedMessages', counts);

    await this.logToFirehose({
      type: params.type,
      school: +params.school,
      schoolName: school.name!,
      title: `Mixed 개별대량 ${params.messages.length}개 (FCM: ${fcmCandidates.length}, SMS: ${smsCandidates.length})`,
      body: `${params.messages[0]?.body || ''}`,
      ids: params.messages.map((v) => v.id),
      role: params.role,
      fcmSuccessCount: counts.fcmSuccess,
      fcmFailureCount: counts.fcmFailure,
      smsSuccessCount: counts.smsSuccess,
      smsFailureCount: counts.smsFailure,
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? 나머지 private 함수들
  //? ---------------------------------------------------------------------- ?//

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
    type: string;
    school: number;
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
        type: logData.type, // 파티션 키
        school: logData.school, // 파티션 키
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
      this.logger.log(`A ${logData.type} log sent to Firehose`);

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to send log to Firehose', error);

      return { success: false, error: error as Error };
    }
  }
}
