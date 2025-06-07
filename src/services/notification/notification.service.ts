import { Injectable, Logger } from '@nestjs/common';
import { formatInTimeZone } from 'date-fns-tz';
import { IFcmData } from 'src/common/interfaces';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { User } from 'src/domain/user/entities/user.entity';
import { AligoService } from 'src/services/aligo/aligo-service';
import { FirehoseService } from 'src/services/aws/firehose.service';
import { FcmService } from 'src/services/fcm/fcm.service';
import {
  BulkNotificationRequest,
  IndividualNotificationRequest,
  NotificationResult,
} from 'src/services/notification/types';
import { DataSource, In, Repository } from 'typeorm';

interface NotificationTarget {
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
  private readonly parentRepository: Repository<Parent>;
  private readonly userRepository: Repository<User>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly fcmService: FcmService,
    private readonly aligoService: AligoService,
    private readonly firehoseService: FirehoseService,
  ) {
    this.parentRepository = this.dataSource.getRepository(Parent);
    this.userRepository = this.dataSource.getRepository(User);
  }

  async sendBulkNotificationToParents(
    params: BulkNotificationRequest,
  ): Promise<void> {
    const parents = await this.parentRepository.find({
      where: { id: In(params.ids) },
      relations: ['user'],
    });

    const targets: NotificationTarget[] = parents.map((parent) => ({
      id: parent.id,
      pushToken: parent.user?.pushToken,
      phone: parent.user?.phone, // 일관성을 위해 user.phone 사용
    }));

    await this.processBulkNotification(params, targets);
  }

  async sendBulkNotificationToUsers(
    params: BulkNotificationRequest,
  ): Promise<void> {
    const users = await this.userRepository.find({
      where: { id: In(params.ids) },
      select: ['id', 'pushToken', 'phone'],
    });

    const targets: NotificationTarget[] = users.map((user) => ({
      id: user.id,
      pushToken: user.pushToken,
      phone: user.phone,
    }));

    await this.processBulkNotification(params, targets);
  }

  async sendPersonalizedNotificationToParents(
    params: IndividualNotificationRequest,
  ): Promise<void> {
    const parentIds = params.notifications.map((n) => n.id);
    const parents = await this.parentRepository.find({
      where: { id: In(parentIds) },
      relations: ['user'],
    });

    const targets: NotificationTarget[] = parents.map((parent) => ({
      id: parent.id,
      pushToken: parent.user?.pushToken,
      phone: parent.phone, // user.phone 사용하면 안된다.
    }));

    await this.processPersonalizedNotification(params, targets);
  }

  async sendPersonalizedNotificationToUsers(
    params: IndividualNotificationRequest,
  ): Promise<void> {
    const userIds = params.notifications.map((n) => n.id);
    const users = await this.userRepository.find({
      where: { id: In(userIds) },
      select: ['id', 'pushToken', 'phone'],
    });

    const targets: NotificationTarget[] = users.map((user) => ({
      id: user.id,
      pushToken: user.pushToken,
      phone: user.phone,
    }));

    await this.processPersonalizedNotification(params, targets);
  }

  private async processBulkNotification(
    params: BulkNotificationRequest,
    targets: NotificationTarget[],
  ): Promise<void> {
    const { title, body, role, target, targetId, senderPhone } = params;

    // Separate targets by notification method
    const tokensForFcm = targets
      .filter((t) => t.pushToken?.trim())
      .map((t) => t.pushToken!)
      .filter((token) => token);

    const targetsForSms = targets
      .filter((t) => !t.pushToken?.trim() && t.phone?.trim())
      .map((t) => ({
        phone: t.phone!,
        body: title ? `[${title}] ${body}` : body,
      }));

    const counts: NotificationCounts = {
      fcmSuccess: 0,
      fcmFailure: 0,
      smsSuccess: 0,
      smsFailure: 0,
    };

    // Send FCM notifications
    if (tokensForFcm.length > 0) {
      await this.sendBulkFcm(
        tokensForFcm,
        { title, body },
        role,
        counts,
        target,
        targetId,
      );
    }

    // Send SMS notifications
    if (targetsForSms.length > 0) {
      await this.sendBulkSms(targetsForSms, counts, senderPhone);
    } else if (targets.some((t) => !t.pushToken?.trim() && !t.phone?.trim())) {
      const invalidTargets = targets.filter(
        (t) => !t.pushToken?.trim() && !t.phone?.trim(),
      );
      counts.smsFailure += invalidTargets.length;
      this.logger.warn(
        `${invalidTargets.length} targets have no valid contact method`,
      );
    }

    this.logNotificationSummary('Bulk', counts);
    await this.logToFirehose({
      ...params,
      ids: targets.map((t) => t.id),
      fcmSuccessCount: counts.fcmSuccess,
      fcmFailureCount: counts.fcmFailure,
      smsSuccessCount: counts.smsSuccess,
      smsFailureCount: counts.smsFailure,
    });
  }

  private async processPersonalizedNotification(
    params: IndividualNotificationRequest,
    targets: NotificationTarget[],
  ): Promise<void> {
    const { notifications, role, senderPhone } = params;
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
      } else if (hasPhone && senderPhone) {
        const message = notification.title
          ? `[${notification.title}] ${notification.body}`
          : notification.body;

        smsTargets.push({
          phone: target.phone!,
          body: message,
        });
      } else {
        this.logger.warn(
          `Target ${notification.id} has no valid contact method or senderPhone not provided`,
        );
        counts.smsFailure++;
      }
    }

    // Send FCM notifications in parallel for better performance
    if (fcmTargets.length > 0) {
      await this.sendPersonalizedFcm(fcmTargets, role, counts);
    }

    // Send SMS notifications
    if (smsTargets.length > 0) {
      await this.sendBulkSms(smsTargets, counts, senderPhone);
    }

    this.logNotificationSummary('Personalized', counts);
    await this.logToFirehose({
      messageType: params.messageType,
      schoolId: params.schoolId,
      schoolName: params.schoolName,
      title: 'Personalized Messages',
      body: `${notifications.length} personalized messages sent`,
      ids: targets.map((t) => t.id),
      role: params.role,
      fcmSuccessCount: counts.fcmSuccess,
      fcmFailureCount: counts.fcmFailure,
      smsSuccessCount: counts.smsSuccess,
      smsFailureCount: counts.smsFailure,
    });
  }

  private async sendBulkFcm(
    tokens: string[],
    notification: { title?: string; body: string },
    role: string,
    counts: NotificationCounts,
    target?: string,
    targetId?: string,
  ): Promise<void> {
    const fcmData: IFcmData = {
      ...(target && { page: target }),
      args: JSON.stringify({
        role,
        ...(targetId && { targetId }),
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
        `FCM bulk notifications - Success: ${result.successCount}, Failure: ${result.failureCount}`,
      );
    } catch (error) {
      this.logger.error('Failed to send FCM bulk notifications', error);
      counts.fcmFailure += tokens.length;
    }
  }

  private async sendPersonalizedFcm(
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
          ...(fcmTarget.notification.targetId && {
            targetId: fcmTarget.notification.targetId,
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
      `Personalized FCM notifications - Success: ${counts.fcmSuccess}, Failure: ${counts.fcmFailure}`,
    );
  }

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
          testmode_yn: 'N',
        },
        smsTargets,
      );

      counts.smsSuccess += result.successCount;
      counts.smsFailure += result.failureCount;

      this.logger.log(
        `SMS notifications - Success: ${result.successCount}, Failure: ${result.failureCount}`,
      );
    } catch (error) {
      this.logger.error('Failed to send SMS notifications', error);
      counts.smsFailure += smsTargets.length;
    }
  }

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

      const partitionedLogData = {
        ...logData,
        year: formatInTimeZone(now, seoulTimeZone, 'yyyy'),
        month: formatInTimeZone(now, seoulTimeZone, 'MM'),
        day: formatInTimeZone(now, seoulTimeZone, 'dd'),
        hour: formatInTimeZone(now, seoulTimeZone, 'HH'),

        // 비즈니스 로직 기반 파티셔닝
        school_id: logData.schoolId, // 학교ID 로 그룹핑
        role_type: this.categorizeRole(logData.role),

        // 쿼리 최적화를 위한 추가 필드
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

        // 알림 타입 분류
        message_type: logData.messageType,

        // 성능 메트릭
        success_rate: this.calculateSuccessRate(
          (logData.fcmSuccessCount || 0) + (logData.smsSuccessCount || 0),
          logData.ids.length,
        ),
      };

      await this.firehoseService.sendRecord(partitionedLogData);

      this.logger.log(
        'Notification log sent to Firehose with Asia/Seoul timezone partitioning metadata',
      );

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to send log to Firehose', error);

      // TODO: 메트릭/모니터링 추가
      // this.metricsService.incrementCounter('firehose.log.failure', {
      //   messageType: logData.messageType,
      //   schoolId: logData.schoolId.toString()
      // });

      // TODO: 중요한 로그는 fallback 저장소에 저장
      // await this.fallbackLogStorage.save(logData);

      // Don't throw error here to avoid failing the main notification process
      // But return the error information for caller awareness
      return { success: false, error: error as Error };
    }
  }

  /**
   * 역할을 카테고리로 분류하여 파티셔닝 효율성 증대
   */
  private categorizeRole(role: string): string {
    const roleLower = role.toLowerCase();
    if (roleLower.includes('instructor')) {
      return 'INSTRUCTOR';
    } else if (roleLower.includes('parent')) {
      return 'PARENT';
    }
    return 'OTHER';
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
}
