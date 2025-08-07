import { Injectable, Logger } from '@nestjs/common';
import * as firebaseAdmin from 'firebase-admin';
import { BatchResponse } from 'firebase-admin/lib/messaging/messaging-api';
import { chunk } from 'src/helpers/array';
import { delay } from 'src/helpers/time';
import {
  BroadcastFcmMessage,
  MultiFcmMessages,
  NotificationResult,
  SingleFcmInput,
  SingleFcmMessage,
} from 'src/services/notification/types';

export interface FcmBatchResult {
  // schoolId: number
  results: NotificationResult[];
  invalidTokens: string[];
  successCount: number;
  failureCount: number;
}

// 타입 정의 추가

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
        results: [{ success: true, id: data.id }],
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
    // 1. 유효한 토큰을 가진 pair 만 추림
    const validTokenPairs = data.tokenPairs.filter(
      (pair) => pair.token && pair.token.trim(),
    );

    // 2. 500개씩 배치로 나눔
    const tokenPairBatches = chunk(validTokenPairs, 500);

    let totalSuccessCount = 0;
    let totalFailureCount = 0;
    const results: NotificationResult[] = [];
    const invalidTokens: string[] = [];

    for (const [index, tokenPairBatch] of tokenPairBatches.entries()) {
      const batchTokens = tokenPairBatch.map((pair) => pair.token);

      try {
        const payload = this.buildMulticastMessage(
          batchTokens,
          { title: data.title, body: data.body },
          { role: data.role, page: data.page, args: data.args },
        );
        const result = await this.sendBatchWithRetry(payload);

        totalSuccessCount += result.successCount;
        totalFailureCount += result.failureCount;

        result.responses.forEach((response, idx) => {
          const tokenPair = tokenPairBatch[idx];

          if (!response.success && this.isInvalidToken(response.error?.code)) {
            invalidTokens.push(tokenPair.token);
          }

          results.push({
            success: response.success,
            messageId: response.messageId,
            error: response.error
              ? new Error(response.error.message || 'FCM send failed')
              : undefined,
            id: tokenPair.id,
          });
        });

        if (index < tokenPairBatches.length - 1) {
          // delay between batches to avoid rate limiting
          await delay(100);
        }
      } catch (error) {
        totalFailureCount += tokenPairBatch.length;

        tokenPairBatch.forEach((pair) => {
          results.push({
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
            id: pair?.id,
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
        // Exclusive message
        const message = messages[0]; // the only item
        const singleMessage: SingleFcmMessage = {
          id: message.id,
          token: message.token,
          title: message.title,
          body: message.body,
          role: message.role,
          page: message.page,
          args: message.args,
          type: data.type,
          schoolId: data.schoolId,
        };

        const result =
          await this.sendSingleMessageToSingleDestination(singleMessage);

        results.push(...result.results);
        invalidTokens.push(...result.invalidTokens);
        successCount += result.successCount;
        failureCount += result.failureCount;
      } else {
        // Multiple messages with same content
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
          schoolId: data.schoolId,
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

  /*
  [
    [ // 그룹 1: title/body/role/page/args 완전히 동일한 내용 => 배치발송가능
      { id: 1, token: 'tokenA', title: 'Hello', body: 'This is a message', role: 'PARENT', page: 'home', args: '123' },
      { id: 2, token: 'tokenB', title: 'Hello', body: 'This is a message', role: 'PARENT', page: 'home', args: '123' },
    ],
    [ // 그룹 2: 다른 title/body/role => 배치발송 불가능
      { id: 3, token: 'tokenC', title: 'Alert', body: 'Another message', role: 'INSTRUCTOR' },
    ],
    [ // 그룹 3: args 다름 => 배치발송 불가능
      { id: 4, token: 'tokenD', title: 'Hello', body: 'This is a message', role: 'PARENT', page: 'home', args: '456' },
    ]
  ]
  */
  private groupMessagesByContent(
    messages: SingleFcmInput[],
  ): SingleFcmInput[][] {
    const messageGroups = new Map<string, SingleFcmInput[]>();

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
   * 메시지의 내용(title, body, role, page, args)을 기반으로 그룹화 키를 생성
   */
  private createContentKey(message: SingleFcmInput): string {
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
