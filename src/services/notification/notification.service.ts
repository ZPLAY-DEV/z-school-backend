import { Injectable, Logger } from '@nestjs/common';
import { formatInTimeZone } from 'date-fns-tz';
import { IFcmData } from 'src/common/interfaces';
import { User } from 'src/domain/user/entities/user.entity';
import { AligoService } from 'src/services/aligo/aligo-service';
import { FirehoseService } from 'src/services/aws/firehose.service';
import { FcmService } from 'src/services/fcm/fcm.service';
import { DataSource, In, Repository } from 'typeorm';

interface NotifyUsersParams {
  messageType: string;
  userIds: number[];
  schoolId: number;
  schoolName: string;
  title?: string;
  body: string;
  role: string;
  target: string;
  targetId: string;
  senderPhone?: string; // SMS 발송자 번호 (pushToken이 없는 사용자를 위해)
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly userRepository: Repository<User>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly fcmService: FcmService,
    private readonly firehoseService: FirehoseService,
    private readonly aligoService: AligoService,
  ) {
    this.userRepository = this.dataSource.getRepository(User);
  }

  async notifyUsers(params: NotifyUsersParams): Promise<void> {
    const {
      messageType,
      userIds,
      schoolId,
      schoolName,
      title,
      body,
      role,
      target,
      targetId,
      senderPhone,
    } = params;

    // Get users with push tokens and phone numbers
    const users = await this.userRepository.find({
      where: { id: In(userIds) },
      select: ['id', 'pushToken', 'phone'],
    });

    // Separate users by notification method
    const usersWithPushToken = users.filter(
      (user) => user.pushToken && user.pushToken.trim(),
    );
    const usersWithoutPushToken = users.filter(
      (user) =>
        (!user.pushToken || !user.pushToken.trim()) &&
        user.phone &&
        user.phone.trim(),
    );

    let fcmSuccessCount = 0;
    let fcmFailureCount = 0;
    let smsSuccessCount = 0;
    let smsFailureCount = 0;

    // Send FCM notifications to users with push tokens
    if (usersWithPushToken.length > 0) {
      const validTokens = usersWithPushToken.map(
        (user) => user.pushToken as string,
      );

      const fcmData: IFcmData = {
        page: target,
        args: JSON.stringify({
          role,
          targetId,
        }),
      };

      try {
        const result = await this.fcmService.sendMulticast(
          validTokens,
          {
            title,
            body,
          },
          fcmData,
        );

        fcmSuccessCount = result.successCount;
        fcmFailureCount = result.failureCount;

        this.logger.log(
          `FCM notifications sent - Success: ${fcmSuccessCount}, Failure: ${fcmFailureCount}`,
        );
      } catch (error) {
        this.logger.error('Failed to send FCM notifications', error);
        fcmFailureCount = usersWithPushToken.length;
      }
    }

    // Send SMS to users without push tokens
    if (usersWithoutPushToken.length > 0) {
      if (!senderPhone) {
        this.logger.warn(
          `${usersWithoutPushToken.length} users without push tokens found, but no senderPhone provided for SMS`,
        );
        smsFailureCount = usersWithoutPushToken.length;
      } else {
        const phoneNumbers = usersWithoutPushToken.map(
          (user) => user.phone as string,
        );

        // SMS에서는 title이 있으면 body에 포함시킴
        const message = title ? `[${title}] ${body}` : body;

        try {
          const result = await this.aligoService.sendBulkWrapper(
            {
              sender: senderPhone,
              msg_type: 'SMS',
              cnt: phoneNumbers.length,
              testmode_yn: 'N',
            },
            phoneNumbers,
            message,
          );

          smsSuccessCount = result.successCount;
          smsFailureCount = result.failureCount;

          this.logger.log(
            `SMS bulk notifications sent - Success: ${smsSuccessCount}, Failure: ${smsFailureCount}`,
          );
        } catch (error) {
          this.logger.error('Failed to send bulk SMS notifications', error);
          smsFailureCount = usersWithoutPushToken.length;
        }
      }
    }

    // Log summary
    this.logger.log(
      `Notification summary - FCM: ${fcmSuccessCount}/${fcmSuccessCount + fcmFailureCount}, SMS: ${smsSuccessCount}/${smsSuccessCount + smsFailureCount}`,
    );

    // Log to Firehose for S3 storage
    await this.logToFirehose({
      messageType,
      schoolId,
      schoolName,
      title,
      body,
      userIds,
      role,
      fcmSuccessCount,
      fcmFailureCount,
      smsSuccessCount,
      smsFailureCount,
    });
  }

  private async logToFirehose(logData: {
    messageType: string;
    schoolId: number;
    schoolName: string;
    title?: string;
    body: string;
    userIds: number[];
    role: string;
    fcmSuccessCount?: number;
    fcmFailureCount?: number;
    smsSuccessCount?: number;
    smsFailureCount?: number;
  }): Promise<void> {
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
        total_users: logData.userIds.length,
        total_success:
          (logData.fcmSuccessCount || 0) + (logData.smsSuccessCount || 0),
        total_failure:
          (logData.fcmFailureCount || 0) + (logData.smsFailureCount || 0),

        // 알림 타입 분류
        message_type: logData.messageType,

        // 성능 메트릭
        success_rate: this.calculateSuccessRate(
          (logData.fcmSuccessCount || 0) + (logData.smsSuccessCount || 0),
          logData.userIds.length,
        ),
      };
      await this.firehoseService.sendRecord(partitionedLogData);
      this.logger.log(
        'Notification log sent to Firehose with Asia/Seoul timezone partitioning metadata',
      );
    } catch (error) {
      this.logger.error('Failed to send log to Firehose', error);
      // Don't throw error here to avoid failing the main notification process
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
