import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as firebaseAdmin from 'firebase-admin';
import {
  BatchResponse,
  TokenMessage,
  TopicMessage,
} from 'firebase-admin/lib/messaging/messaging-api';

import { IFcmData } from 'src/common/interfaces';

interface NotificationPayload {
  title?: string;
  body?: string;
  imageUrl?: string;
}

interface FcmBatchResult {
  successCount: number;
  failureCount: number;
  failedTokens?: string[];
  invalidTokens?: string[];
}

interface TopicSubscriptionResult {
  successCount: number;
  failureCount: number;
  errors?: Array<{ token: string; error: string }>;
}

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);
  private readonly MAX_TOKENS_PER_BATCH = 500;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 1000;

  /**
   * Send notification to a specific device token
   */
  async sendToToken(message: TokenMessage): Promise<string> {
    try {
      this.validateTokenMessage(message);
      const result = await firebaseAdmin.messaging().send(message);
      this.logger.log(`Message sent successfully to token: ${message.token}`);
      return result;
    } catch (error) {
      this.handleFcmError(error, 'sendToToken', { token: message.token });
      throw error;
    }
  }

  /**
   * Send notification to a topic
   */
  async sendToTopic(message: TopicMessage): Promise<string> {
    try {
      this.validateTopicMessage(message);
      const result = await firebaseAdmin.messaging().send(message);
      this.logger.log(`Message sent successfully to topic: ${message.topic}`);
      return result;
    } catch (error) {
      this.handleFcmError(error, 'sendToTopic', { topic: message.topic });
      throw error;
    }
  }

  /**
   * Send notification based on topic conditions
   */
  async sendToCondition(
    condition: string,
    notification: NotificationPayload,
    data: IFcmData,
  ): Promise<string> {
    try {
      this.validateCondition(condition);
      this.validateNotificationPayload(notification);
      this.validateData(data);

      const payload = this.buildConditionMessage(condition, notification, data);
      const result = await firebaseAdmin.messaging().send(payload);

      this.logger.log(`Message sent successfully to condition: ${condition}`);
      return result;
    } catch (error) {
      this.handleFcmError(error, 'sendToCondition', { condition });
      throw error;
    }
  }

  /**
   * Send notification to multiple tokens with automatic batching and retry
   */
  async sendMulticast(
    tokens: string[],
    notification: NotificationPayload,
    data: IFcmData,
  ): Promise<FcmBatchResult> {
    if (!tokens || tokens.length === 0) {
      throw new BadRequestException('No tokens provided');
    }

    this.validateNotificationPayload(notification);
    this.validateData(data);

    const uniqueTokens = [
      ...new Set(tokens.filter((token) => token && token.trim())),
    ];
    if (uniqueTokens.length === 0) {
      throw new BadRequestException('No valid tokens provided');
    }

    this.logger.log(`Starting multicast send to ${uniqueTokens.length} tokens`);

    const payload = this.buildMulticastMessage(
      uniqueTokens,
      notification,
      data,
    );
    let totalSuccessCount = 0;
    let totalFailureCount = 0;
    const failedTokens: string[] = [];
    const invalidTokens: string[] = [];

    const tokenBatches = this.chunkArray(
      uniqueTokens,
      this.MAX_TOKENS_PER_BATCH,
    );

    for (let i = 0; i < tokenBatches.length; i++) {
      const batch = tokenBatches[i];
      this.logger.log(
        `Processing batch ${i + 1}/${tokenBatches.length} with ${batch.length} tokens`,
      );

      try {
        const result = await this.sendBatchWithRetry({
          ...payload,
          tokens: batch,
        });

        totalSuccessCount += result.successCount;
        totalFailureCount += result.failureCount;

        // Collect failed and invalid tokens
        result.responses.forEach((response, index) => {
          if (!response.success) {
            const token = batch[index];
            const errorCode = response.error?.code;

            if (this.isInvalidToken(errorCode)) {
              invalidTokens.push(token);
            } else {
              failedTokens.push(token);
            }
          }
        });

        // Small delay between batches to avoid rate limiting
        if (i < tokenBatches.length - 1) {
          await this.delay(100);
        }
      } catch (error) {
        this.logger.error(`Batch ${i + 1} failed completely:`, error);
        totalFailureCount += batch.length;
        failedTokens.push(...batch);
      }
    }

    const result: FcmBatchResult = {
      successCount: totalSuccessCount,
      failureCount: totalFailureCount,
      failedTokens: failedTokens.length > 0 ? failedTokens : undefined,
      invalidTokens: invalidTokens.length > 0 ? invalidTokens : undefined,
    };

    this.logger.log(
      `Multicast completed - Success: ${totalSuccessCount}, Failure: ${totalFailureCount}`,
    );

    if (invalidTokens.length > 0) {
      this.logger.warn(
        `Found ${invalidTokens.length} invalid tokens that should be removed from database`,
      );
    }

    return result;
  }

  /**
   * Subscribe tokens to a topic
   */
  async subscribeToTopic(
    tokens: string[],
    topic: string,
  ): Promise<TopicSubscriptionResult> {
    try {
      this.validateTokens(tokens);
      this.validateTopic(topic);

      const response = await firebaseAdmin
        .messaging()
        .subscribeToTopic(tokens, topic);

      const result: TopicSubscriptionResult = {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };

      if (response.failureCount > 0 && response.errors) {
        result.errors = response.errors.map((error, index) => ({
          token: tokens[index],
          error: error.error.message,
        }));
      }

      this.logger.log(
        `Topic subscription - Topic: ${topic}, Success: ${response.successCount}, Failure: ${response.failureCount}`,
      );
      return result;
    } catch (error) {
      this.handleFcmError(error, 'subscribeToTopic', {
        topic,
        tokenCount: tokens.length,
      });
      throw error;
    }
  }

  /**
   * Unsubscribe tokens from a topic
   */
  async unsubscribeFromTopic(
    tokens: string[],
    topic: string,
  ): Promise<TopicSubscriptionResult> {
    try {
      this.validateTokens(tokens);
      this.validateTopic(topic);

      const response = await firebaseAdmin
        .messaging()
        .unsubscribeFromTopic(tokens, topic);

      const result: TopicSubscriptionResult = {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };

      if (response.failureCount > 0 && response.errors) {
        result.errors = response.errors.map((error, index) => ({
          token: tokens[index],
          error: error.error.message,
        }));
      }

      this.logger.log(
        `Topic unsubscription - Topic: ${topic}, Success: ${response.successCount}, Failure: ${response.failureCount}`,
      );
      return result;
    } catch (error) {
      this.handleFcmError(error, 'unsubscribeFromTopic', {
        topic,
        tokenCount: tokens.length,
      });
      throw error;
    }
  }

  /**
   * Bulk subscribe tokens to multiple topics
   */
  async bulkSubscribeToTopics(
    tokens: string[],
    topics: string[],
  ): Promise<TopicSubscriptionResult[]> {
    const results: TopicSubscriptionResult[] = [];

    for (const topic of topics) {
      try {
        const result = await this.subscribeToTopic(tokens, topic);
        results.push(result);
        await this.delay(100); // Prevent rate limiting
      } catch (error) {
        this.logger.error(`Failed to subscribe to topic ${topic}:`, error);
        results.push({
          successCount: 0,
          failureCount: tokens.length,
          errors: tokens.map((token) => ({ token, error: error.message })),
        });
      }
    }

    return results;
  }

  // Private helper methods

  private async sendBatchWithRetry(
    payload: firebaseAdmin.messaging.MulticastMessage,
  ): Promise<BatchResponse> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        return await firebaseAdmin.messaging().sendEachForMulticast(payload);
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Batch send attempt ${attempt} failed:`,
          error.message,
        );

        if (attempt < this.MAX_RETRY_ATTEMPTS) {
          await this.delay(this.RETRY_DELAY_MS * attempt);
        }
      }
    }

    throw lastError;
  }

  private buildConditionMessage(
    condition: string,
    notification: NotificationPayload,
    data: IFcmData,
  ): firebaseAdmin.messaging.ConditionMessage {
    return {
      condition,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
      },
      data: {
        page: data.page,
        args: data.args,
      },
      apns: {
        fcmOptions: {
          imageUrl: notification?.imageUrl,
        },
        payload: {
          aps: {
            badge: 1,
            sound: 'default',
          },
        },
      },
      android: {
        priority: 'high',
        ttl: 60 * 60 * 24, // 24 hours
        notification: {
          priority: 'high',
          defaultSound: true,
        },
      },
    };
  }

  private buildMulticastMessage(
    tokens: string[],
    notification: NotificationPayload,
    data: IFcmData,
  ): firebaseAdmin.messaging.MulticastMessage {
    return {
      tokens,
      notification: {
        title: notification?.title,
        body: notification?.body,
        imageUrl: notification?.imageUrl,
      },
      data: {
        page: data.page,
        args: data.args,
      },
      apns: {
        fcmOptions: {
          imageUrl: notification?.imageUrl,
        },
        payload: {
          aps: {
            badge: 1,
            sound: 'default',
          },
        },
      },
      android: {
        priority: 'high',
        ttl: 60 * 60 * 24, // 24 hours
        notification: {
          priority: 'high',
          defaultSound: true,
        },
      },
    };
  }

  private validateTokenMessage(message: TokenMessage): void {
    if (!message.token) {
      throw new BadRequestException('Token is required');
    }
  }

  private validateTopicMessage(message: TopicMessage): void {
    if (!message.topic) {
      throw new BadRequestException('Topic is required');
    }
  }

  private validateCondition(condition: string): void {
    if (!condition || typeof condition !== 'string') {
      throw new BadRequestException('Valid condition string is required');
    }

    // Basic validation for topic condition format
    if (!condition.includes('in topics')) {
      throw new BadRequestException('Condition must use "in topics" format');
    }
  }

  private validateNotificationPayload(notification: NotificationPayload): void {
    if (!notification || typeof notification !== 'object') {
      throw new BadRequestException('Notification payload is required');
    }

    if (!notification.title && !notification.body) {
      throw new BadRequestException(
        'Notification must have either title or body',
      );
    }
  }

  private validateData(data: IFcmData): void {
    if (!data || typeof data !== 'object') {
      throw new BadRequestException('Data payload is required');
    }

    if (!data.page) {
      throw new BadRequestException('Data.page is required');
    }
  }

  private validateTokens(tokens: string[]): void {
    if (!Array.isArray(tokens) || tokens.length === 0) {
      throw new BadRequestException(
        'Tokens array is required and must not be empty',
      );
    }

    const validTokens = tokens.filter(
      (token) => token && typeof token === 'string' && token.trim(),
    );
    if (validTokens.length === 0) {
      throw new BadRequestException('No valid tokens provided');
    }
  }

  private validateTopic(topic: string): void {
    if (!topic || typeof topic !== 'string') {
      throw new BadRequestException('Valid topic string is required');
    }

    // FCM topic name restrictions
    if (!/^[a-zA-Z0-9-_.~%]+$/.test(topic)) {
      throw new BadRequestException('Topic name contains invalid characters');
    }
  }

  private isInvalidToken(errorCode?: string): boolean {
    const invalidTokenCodes = [
      'messaging/invalid-registration-token',
      'messaging/registration-token-not-registered',
    ];
    return errorCode ? invalidTokenCodes.includes(errorCode) : false;
  }

  private handleFcmError(
    error: any,
    method: string,
    context?: Record<string, any>,
  ): void {
    const errorMessage = error?.message || 'Unknown FCM error';
    const errorCode = error?.code;

    this.logger.error(`FCM Error in ${method}: ${errorMessage}`, {
      errorCode,
      context,
      stack: error?.stack,
    });
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
