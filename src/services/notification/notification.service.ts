import { Inject, Injectable, Logger } from '@nestjs/common';
import { AWS_SQS_CLIENT } from 'src/common/constants';
import { SqsService } from 'src/services/aws/sqs.service';
import { FcmService } from 'src/services/fcm/fcm.service';
import { SensService } from 'src/services/ncloud/sens.service';
import { FcmAdapter } from 'src/services/notification/fcm.adapter';
import { KakaoAdapter } from 'src/services/notification/kakao.adapter';
import {
  FcmChannelResult,
  KakaoChannelResult,
  NotificationCoreData,
  NotificationFullData,
  NotificationSendResult,
} from 'src/services/notification/types';

//! invalid token nullify 는 node sqs handler 에서 처러.
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(AWS_SQS_CLIENT)
    private readonly sqsClient: SqsService,
    private readonly fcmService: FcmService,
    private readonly sensService: SensService,
  ) {}

  async send(data: NotificationFullData): Promise<NotificationSendResult> {
    console.log('🔍 [DEBUG] send - data:', JSON.stringify(data, null, 2));
    try {
      const fcmMessages = data.messages.filter(
        (v: NotificationCoreData) => v.token,
      ) as (NotificationCoreData & { token: string })[];
      const kakaoMessages = data.messages.filter(
        (v: NotificationCoreData) => !v.token,
      );

      const result: NotificationSendResult = {
        success: true,
        totalSent: 0,
        totalFailed: 0,
        channels: {},
        errors: [],
      };

      // FCM 메시지 배치 처리
      if (fcmMessages.length > 0) {
        const fcmResult = await this._processFcmMessages(fcmMessages);
        result.channels.fcm = fcmResult;
        result.totalSent += fcmResult.sent;
        result.totalFailed += fcmResult.failed;

        if (!fcmResult.success) {
          result.success = false;
        }
      }

      // todo. messages 는 최대 100 개까지만 가능하기 때문에 이에 대응해야 함.
      if (kakaoMessages.length > 0) {
        const kakaoResult = await this._processKakaoMessages(kakaoMessages);
        result.channels.kakao = kakaoResult;
        result.totalSent += kakaoResult.sent;
        result.totalFailed += kakaoResult.failed;

        if (!kakaoResult.success) {
          result.success = false;
        }
      }

      // 전체 성공 여부 결정
      result.success = result.totalFailed === 0;

      return result;
    } catch (error) {
      this.logger.error('Failed to send notifications', error);
      return {
        success: false,
        totalSent: 0,
        totalFailed: 0,
        channels: {},
        errors: [error instanceof Error ? error : new Error(String(error))],
      };
    }
  }

  private async _processFcmMessages(
    fcmMessages: (NotificationCoreData & { token: string })[],
  ): Promise<FcmChannelResult> {
    const fcmPayloads = FcmAdapter.toPayloadArray(fcmMessages);
    const { results: fcmResults, invalidTokens } =
      await this.fcmService.sendMany(fcmPayloads);

    // Invalid token 정리
    if (invalidTokens.length > 0) {
      this.fcmService.cleanupInvalidTokens(invalidTokens);
      this.logger.warn(`Found ${invalidTokens.length} invalid FCM tokens`);
    }

    const sent = fcmResults.filter((r) => r.success).length;
    const failed = fcmResults.filter((r) => !r.success).length;

    return {
      success: failed === 0,
      sent,
      failed,
      invalidTokens,
      results: fcmResults,
    };
  }

  private async _processKakaoMessages(
    kakaoMessages: NotificationCoreData[],
  ): Promise<KakaoChannelResult> {
    const { template, messages } = KakaoAdapter.toPayload(kakaoMessages);
    const kakaoResult = await this.sensService.sendAlimtalk(
      {
        template,
        messages,
      },
      true,
    );

    // SMS 대체 발송 여부 확인
    let smsFailoverCount = 0;
    if (kakaoResult.messages) {
      smsFailoverCount = kakaoResult.messages.filter(
        (msg) => msg.useSmsFailover === true,
      ).length;
      if (smsFailoverCount > 0) {
        this.logger.warn(
          `카카오 알림톡 중 ${smsFailoverCount}개가 SMS로 대체 발송되었습니다.`,
        );
      }
    }

    const sent = kakaoResult.success ? kakaoMessages.length : 0;
    const failed = kakaoResult.success ? 0 : kakaoMessages.length;

    return {
      success: kakaoResult.success,
      sent,
      failed,
      smsFailoverCount,
      requestId: kakaoResult.requestId,
      statusCode: kakaoResult.statusCode,
      statusName: kakaoResult.statusName,
      messages: kakaoResult.messages,
      error: kakaoResult.error,
    };
  }

  async sendViaQueue(data: NotificationCoreData[]): Promise<{
    success: boolean;
  }> {
    try {
      await this.sqsClient.sendMessage({
        type: 'SEND_MESSAGES',
        data,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to send message to SQS', error);
      return { success: false };
    }
  }

  async text(data: { body: string; phone: string }): Promise<{
    success: boolean;
  }> {
    try {
      await this.sqsClient.sendMessage({
        type: 'SEND_TEXT',
        data,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to send message via SQS', error);
      return { success: false };
    }
  }
}
