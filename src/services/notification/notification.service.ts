import { Injectable, Logger } from '@nestjs/common';
import { IFcmData } from 'src/common/interfaces';
import { User } from 'src/domain/user/entities/user.entity';
import { AligoService } from 'src/services/aligo/aligo-service';
import { FirehoseService } from 'src/services/aws/firehose.service';
import { FcmService } from 'src/services/fcm/fcm.service';
import { DataSource, In, Repository } from 'typeorm';

interface NotifyUsersParams {
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
        for (const user of usersWithoutPushToken) {
          try {
            await this.sendSms(senderPhone, user.phone as string, body, title);
            smsSuccessCount++;
          } catch (error) {
            this.logger.error(`Failed to send SMS to ${user.phone}`, error);
            smsFailureCount++;
          }
        }

        this.logger.log(
          `SMS notifications sent - Success: ${smsSuccessCount}, Failure: ${smsFailureCount}`,
        );
      }
    }

    // Log summary
    this.logger.log(
      `Notification summary - FCM: ${fcmSuccessCount}/${fcmSuccessCount + fcmFailureCount}, SMS: ${smsSuccessCount}/${smsSuccessCount + smsFailureCount}`,
    );

    // Log to Firehose for S3 storage
    await this.logToFirehose({
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

  private async sendSms(
    senderPhone: string,
    receiverPhone: string,
    body: string,
    title?: string,
  ): Promise<void> {
    // SMS에서는 title이 있으면 body에 포함시킴
    const message = title ? `[${title}] ${body}` : body;

    await this.aligoService.send({
      sender: senderPhone,
      receiver: receiverPhone,
      msg: message,
      msg_type: 'SMS',
      testmode_yn: 'N',
    });
  }

  private async logToFirehose(logData: {
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
      await this.firehoseService.sendRecord(logData);
      this.logger.log('Notification log sent to Firehose');
    } catch (error) {
      this.logger.error('Failed to send log to Firehose', error);
      // Don't throw error here to avoid failing the main notification process
    }
  }
}
