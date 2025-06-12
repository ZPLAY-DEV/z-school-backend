import { Injectable, Logger } from '@nestjs/common';
import * as firebaseAdmin from 'firebase-admin';
import { BatchResponse } from 'firebase-admin/lib/messaging/messaging-api';
import { chunk } from 'src/helpers/array';
import { delay } from 'src/helpers/time';
import {
  BroadcastFcmMessage,
  FcmData,
  MessageBody,
  MultiFcmMessages,
  NotificationResult,
  SingleFcmMessage,
  TokenPair,
} from 'src/services/notification/types';

export interface FcmBatchResult {
  results: NotificationResult[];
  invalidTokens: string[];
  successCount: number;
  failureCount: number;
}

// 타입 정의 추가
type FcmMessageInput = TokenPair & MessageBody & FcmData;

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);

  async sendSingleMessageToSingleDestination(
    data: SingleFcmMessage,
  ): Promise<FcmBatchResult> {
    try {
      await firebaseAdmin.messaging().send({
        token: data.token,
        ...this.buildFirebaseMessage(
          { title: data.title, body: data.body },
          { role: data.role, page: data.page, args: data.args },
        ),
      });

      return {
        results: [{ success: true }],
        invalidTokens: [],
        successCount: 1,
        failureCount: 0,
      };
    } catch (error) {
      const isInvalid = this.isInvalidTokenError(error);
      return {
        results: [
          {
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
          },
        ],
        invalidTokens: isInvalid ? [data.token] : [],
        successCount: 0,
        failureCount: 1,
      };
    }
  }

  async sendSingleMessageToMultipleDestinations(
    data: BroadcastFcmMessage,
  ): Promise<FcmBatchResult> {
    const tokens = data.tokenPairs.map((pair) => pair.token);
    const validTokens = tokens.filter((v) => v && v.trim());

    let totalSuccessCount = 0;
    let totalFailureCount = 0;
    const results: NotificationResult[] = [];
    const invalidTokens: string[] = [];

    const tokenBatches = chunk(validTokens, 500);

    for (let i = 0; i < tokenBatches.length; i++) {
      const batch = tokenBatches[i];

      try {
        const payload = this.buildMulticastMessage(
          batch,
          { title: data.title, body: data.body },
          { role: data.role, page: data.page, args: data.args },
        );
        const result = await this.sendBatchWithRetry(payload);

        totalSuccessCount += result.successCount;
        totalFailureCount += result.failureCount;

        // Collect invalid tokens
        result.responses.forEach((response, index) => {
          const token = batch[index];
          const tokenPair = data.tokenPairs.find(
            (pair) => pair.token === token,
          );

          if (!response.success) {
            const errorCode = response.error?.code;

            if (this.isInvalidToken(errorCode)) {
              invalidTokens.push(token);
            }
          }

          const notificationResult: NotificationResult = {
            success: response.success,
            error: response.error
              ? new Error(response.error.message || 'FCM send failed')
              : undefined,
            id: tokenPair?.id,
          };

          results.push(notificationResult);
        });

        // Small delay between batches to avoid rate limiting
        if (i < tokenBatches.length - 1) {
          await delay(100);
        }
      } catch (error) {
        totalFailureCount += batch.length;

        // Add failed results for each token in the batch
        batch.forEach((token) => {
          const tokenPair = data.tokenPairs.find(
            (pair) => pair.token === token,
          );
          results.push({
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
            id: tokenPair?.id,
          });
        });
      }
    }

    return {
      results,
      invalidTokens,
      successCount: totalSuccessCount,
      failureCount: totalFailureCount,
    };
  }

  async sendMultipleMessagesToMultipleDestinations(
    data: MultiFcmMessages,
  ): Promise<FcmBatchResult> {
    const results: NotificationResult[] = [];
    const invalidTokens: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    // Group messages by their content (title, body, role, page, args)
    const messageGroups = this.groupMessagesByContent(data.messages);

    for (const messages of messageGroups) {
      if (messages.length === 1) {
        // Single message - use single destination method
        const message = messages[0];
        const singleMessage: SingleFcmMessage = {
          id: message.id,
          token: message.token,
          title: message.title,
          body: message.body,
          role: message.role,
          page: message.page,
          args: message.args,
          type: data.type,
          school: data.school,
        };

        const result =
          await this.sendSingleMessageToSingleDestination(singleMessage);

        results.push(...result.results);
        invalidTokens.push(...result.invalidTokens);
        successCount += result.successCount;
        failureCount += result.failureCount;
      } else {
        // Multiple messages with same content - use batch method
        const tokenPairs = messages
          .filter((message) => message.id !== undefined)
          .map((message) => ({
            id: message.id,
            token: message.token,
          }));

        // Use first message as representative for shared content
        const firstMessage = messages[0];
        const broadcastMessage: BroadcastFcmMessage = {
          tokenPairs,
          title: firstMessage.title,
          body: firstMessage.body,
          role: firstMessage.role,
          page: firstMessage.page,
          args: firstMessage.args,
          type: data.type,
          school: data.school,
        };

        const result =
          await this.sendSingleMessageToMultipleDestinations(broadcastMessage);

        results.push(...result.results);
        invalidTokens.push(...result.invalidTokens);
        successCount += result.successCount;
        failureCount += result.failureCount;
      }
    }

    return {
      results,
      invalidTokens,
      successCount,
      failureCount,
    };
  }

  /**
   * 같은 내용(title, body, role, page, args)의 메시지들을 그룹화합니다.
   * 같은 내용의 메시지들은 배치로 묶어서 발송할 수 있습니다.
   */
  private groupMessagesByContent(
    messages: FcmMessageInput[],
  ): FcmMessageInput[][] {
    const messageGroups = new Map<string, FcmMessageInput[]>();

    for (const message of messages) {
      const contentKey = this.createContentKey(message);

      if (!messageGroups.has(contentKey)) {
        messageGroups.set(contentKey, []);
      }
      messageGroups.get(contentKey)!.push(message);
    }

    return Array.from(messageGroups.values());
  }

  /**
   * 메시지의 내용을 기반으로 그룹화 키를 생성합니다.
   * 같은 키를 가진 메시지들은 배치로 묶어서 발송할 수 있습니다.
   */
  private createContentKey(message: FcmMessageInput): string {
    return [
      message.title || '',
      message.body,
      message.role,
      message.page || '',
      message.args || '',
    ].join('|');
  }

  private async sendBatchWithRetry(
    payload: firebaseAdmin.messaging.MulticastMessage,
  ): Promise<BatchResponse> {
    let lastError: any;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await firebaseAdmin.messaging().sendEachForMulticast(payload);
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Batch send attempt ${attempt} failed:`,
          error.message,
        );

        if (attempt < 3) {
          await delay(100 * attempt);
        }
      }
    }

    throw lastError;
  }

  private isInvalidToken(errorCode: string | undefined): boolean {
    if (!errorCode) return false;

    const invalidTokenCodes = [
      'messaging/invalid-registration-token',
      'messaging/registration-token-not-registered',
      'messaging/invalid-argument',
    ];

    return invalidTokenCodes.includes(errorCode);
  }

  private getCommonFcmConfig() {
    return {
      android: {
        priority: 'high' as const,
        ttl: 60 * 60 * 24, // 24 hours
        notification: {
          priority: 'high' as const,
          defaultSound: true,
        },
      },
      apns: {
        payload: {
          aps: {
            badge: 1,
            sound: 'default',
          },
        },
      },
    };
  }

  private buildMulticastMessage(
    tokens: string[],
    notification: { title?: string; body: string },
    data: { role: string; page?: string; args?: string },
  ): firebaseAdmin.messaging.MulticastMessage {
    return {
      tokens,
      notification: {
        title: notification.title,
        body: notification.body || '',
      },
      data: {
        role: data.role,
        page: data.page || '',
        args: data.args || '',
      },
      ...this.getCommonFcmConfig(),
    };
  }

  private buildFirebaseMessage(
    notification: { title?: string; body: string },
    data: { role: string; page?: string; args?: string },
  ) {
    return {
      notification: {
        title: notification.title,
        body: notification.body || '',
      },
      data: {
        role: data.role,
        page: data.page || '',
        args: data.args || '',
      },
      ...this.getCommonFcmConfig(),
    };
  }

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
        message.includes('Requested entity was not found'),
    );
  }
}
