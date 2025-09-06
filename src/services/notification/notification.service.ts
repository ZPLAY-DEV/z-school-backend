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
    const BATCH_SIZE = 100;
    const batches = this._chunkArray(kakaoMessages, BATCH_SIZE);

    let totalSent = 0;
    let totalFailed = 0;
    let totalSmsFailoverCount = 0;
    let overallSuccess = true;
    const allMessages: any[] = [];
    const allErrors: Error[] = [];
    const requestIds: string[] = [];
    const statusCodes: string[] = [];
    const statusNames: string[] = [];

    this.logger.log(
      `📱 Processing ${kakaoMessages.length} kakao messages in ${batches.length} batches`,
    );

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      this.logger.log(
        `📱 Processing batch ${i + 1}/${batches.length} (${batch.length} messages)`,
      );
      try {
        const { template, messages } = KakaoAdapter.toPayload(batch);
        const kakaoResult = await this.sensService.sendAlimtalk(
          {
            template,
            messages,
          },
          true,
        );

        // 배치 결과 처리
        if (kakaoResult.success) {
          totalSent += batch.length;
        } else {
          totalFailed += batch.length;
          overallSuccess = false;
        }

        // SMS 대체 발송 여부 확인
        let smsFailoverCount = 0;
        if (kakaoResult.messages) {
          smsFailoverCount = kakaoResult.messages.filter(
            (msg) => msg.useSmsFailover === true,
          ).length;
          totalSmsFailoverCount += smsFailoverCount;
        }

        // 결과 수집
        allMessages.push(...(kakaoResult.messages || []));
        if (kakaoResult.requestId) {
          requestIds.push(kakaoResult.requestId);
        }
        if (kakaoResult.statusCode) {
          statusCodes.push(kakaoResult.statusCode);
        }
        if (kakaoResult.statusName) {
          statusNames.push(kakaoResult.statusName);
        }

        if (kakaoResult.error) {
          allErrors.push(kakaoResult.error);
        }
      } catch (error) {
        this.logger.error(`❌ Batch ${i + 1} failed:`, error);
        totalFailed += batch.length;
        overallSuccess = false;
        allErrors.push(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }

    // 전체 결과 로깅
    if (totalSmsFailoverCount > 0) {
      this.logger.warn(
        `😳 카카오 알림톡 중 ${totalSmsFailoverCount}개가 SMS로 대체 발송되었습니다.`,
      );
    }

    console.log(`🚗 카카오 전송완료: 성공(${totalSent}), 실패(${totalFailed})`);

    return {
      success: overallSuccess && totalFailed === 0,
      sent: totalSent,
      failed: totalFailed,
      smsFailoverCount: totalSmsFailoverCount,
      requestId: requestIds.length > 0 ? requestIds.join(', ') : undefined,
      statusCode: statusCodes.length > 0 ? statusCodes.join(', ') : undefined,
      statusName: statusNames.length > 0 ? statusNames.join(', ') : undefined,
      messages: allMessages,
      error: allErrors.length > 0 ? allErrors[0] : undefined,
    };
  }

  /**
   * 배열을 지정된 크기로 청크 단위로 나누기
   * @param array - 나눌 배열
   * @param chunkSize - 청크 크기
   * @returns 청크 배열
   */
  private _chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async sendViaQueue(data: NotificationFullData): Promise<{
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
}
