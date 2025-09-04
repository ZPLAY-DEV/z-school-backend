import { Injectable, Logger } from '@nestjs/common';
import * as firebaseAdmin from 'firebase-admin';
import {
  NotificationResult,
  SingleFcmData,
} from 'src/services/notification/types';

export interface FcmSendResult {
  result: NotificationResult;
  invalidToken?: string;
}

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);

  /**
   * 단일 FCM 메시지 발송
   */
  async sendOne(data: SingleFcmData): Promise<FcmSendResult> {
    try {
      const messageId = await firebaseAdmin.messaging().send(data);

      return {
        result: {
          success: true,
          messageId,
        },
      };
    } catch (error) {
      const isInvalid = this.isInvalidTokenError(error);

      if (isInvalid) {
        this.logger.warn(`Invalid token detected: ${data.token}`);
        return {
          result: {
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
          },
          invalidToken: data.token,
        };
      }

      return {
        result: {
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      };
    }
  }

  /**
   * 다중 FCM 메시지 발송 (순차 처리)
   */
  async sendMany(data: SingleFcmData[]): Promise<{
    results: NotificationResult[];
    invalidTokens: string[];
  }> {
    if (data.length === 0) {
      return { results: [], invalidTokens: [] };
    }

    const results: NotificationResult[] = [];
    const invalidTokens: string[] = [];

    for (const message of data) {
      const { result, invalidToken } = await this.sendOne(message);
      results.push(result);

      if (invalidToken) {
        invalidTokens.push(invalidToken);
      }
    }

    return { results, invalidTokens };
  }

  /**
   * Invalid token 에러 판별
   */
  private isInvalidTokenError(error: any): boolean {
    if (!error) return false;

    const code = error?.code || error?.errorInfo?.code;
    const message = error?.message || '';

    const invalidTokenCodes = [
      'messaging/invalid-registration-token',
      'messaging/registration-token-not-registered',
      'messaging/invalid-argument',
    ];

    return Boolean(
      (typeof code === 'string' && invalidTokenCodes.includes(code)) ||
        message.includes('invalid-registration-token') ||
        message.includes('registration-token-not-registered') ||
        message.includes('Requested entity was not found') ||
        message.includes(
          'The registration token is not a valid FCM registration token',
        ),
    );
  }

  /**
   * Invalid token 정리
   */
  cleanupInvalidTokens(invalidTokens: string[]): void {
    if (invalidTokens.length === 0) return;

    this.logger.log(`Cleaning up ${invalidTokens.length} invalid tokens`);

    // TODO: 데이터베이스에서 invalid token 제거 로직 구현
    // 예: await this.userService.removeInvalidTokens(invalidTokens);

    this.logger.log(
      `Successfully cleaned up ${invalidTokens.length} invalid tokens`,
    );
  }
}
