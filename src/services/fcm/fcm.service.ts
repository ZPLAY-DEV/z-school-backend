import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import * as firebaseAdmin from 'firebase-admin';
import {
  BatchResponse,
  Notification,
  TokenMessage,
} from 'firebase-admin/lib/messaging/messaging-api';
import { AWS_SQS_CLIENT } from 'src/common/constants';
import { IFcmData } from 'src/common/interfaces';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { SqsService } from 'src/services/aws/sqs.service';

interface FcmBatchResult {
  successCount: number;
  failureCount: number;
  failedTokens?: string[];
  invalidTokens?: string[];
}

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);
  private readonly MAX_TOKENS_PER_BATCH = 500;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 1000;

  constructor(
    @Inject(AWS_SQS_CLIENT)
    private readonly sqsClient: SqsService,
  ) {}

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
      await this.handleFcmError(error, 'sendToToken', {
        token: message.token,
      });
      throw error;
    }
  }

  /**
   * Send notification to multiple tokens with automatic batching and retry
   */
  async sendMulticast(
    tokens: string[],
    notification: Notification,
    data: IFcmData,
  ): Promise<FcmBatchResult> {
    if (!tokens || tokens.length === 0) {
      throw new BadRequestException('No tokens provided');
    }

    this.validateNotification(notification);
    this.validateData(data);

    const validTokens = tokens.filter((v) => v && v.trim());
    if (validTokens.length === 0) {
      throw new BadRequestException('No valid tokens provided');
    }

    let totalSuccessCount = 0;
    let totalFailureCount = 0;
    const failedTokens: string[] = [];
    const invalidTokens: string[] = [];

    const tokenBatches = this.chunkArray(
      validTokens,
      this.MAX_TOKENS_PER_BATCH,
    );

    for (let i = 0; i < tokenBatches.length; i++) {
      const batch = tokenBatches[i];
      this.logger.log(
        `Processing batch ${i + 1}/${tokenBatches.length} with ${batch.length} tokens`,
      );

      try {
        const payload = this.buildMulticastMessage(batch, notification, data);
        const result = await this.sendBatchWithRetry(payload);

        totalSuccessCount += result.successCount;
        totalFailureCount += result.failureCount;

        // Collect failed and invalid tokens
        result.responses.forEach((response, index) => {
          if (!response.success) {
            const token = batch[index];
            const errorCode = response.error?.code;

            if (this.isInvalidToken(errorCode)) {
              invalidTokens.push(token);
              // Send SQS message to handle invalid token cleanup
              this.handleInvalidToken(token).catch((error) => {
                this.logger.warn(
                  `Failed to send invalid token notification for ${token}`,
                  error,
                );
              });
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
        `Found ${invalidTokens.length} invalid tokens that will be cleaned up`,
      );
    }

    return result;
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

  private buildMulticastMessage(
    tokens: string[],
    notification: Notification,
    data: IFcmData,
  ): firebaseAdmin.messaging.MulticastMessage {
    return {
      tokens,
      notification,
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

  private validateNotification(notification: Notification): void {
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

  private isInvalidToken(errorCode?: string): boolean {
    const invalidTokenCodes = [
      'messaging/invalid-registration-token',
      'messaging/registration-token-not-registered',
    ];
    return errorCode ? invalidTokenCodes.includes(errorCode) : false;
  }

  private async handleInvalidToken(token: string): Promise<void> {
    try {
      await this.sqsClient.sendMessage({
        type: 'INVALID_USER_TOKEN',
        data: {
          token,
        },
      });
    } catch (error) {
      this.logger.warn(
        'Failed to send invalid token notification to SQS',
        error,
      );
    }
  }

  private async handleFcmError(
    error: any,
    method: string,
    context?: Record<string, any>,
  ): Promise<void> {
    if (
      error.code === 'messaging/invalid-registration-token' ||
      error.code === 'messaging/registration-token-not-registered' ||
      error.errorInfo?.code === 'messaging/invalid-registration-token' ||
      error.errorInfo?.code === 'messaging/registration-token-not-registered'
    ) {
      if (context?.token && typeof context.token === 'string') {
        await this.handleInvalidToken(context.token);
      }

      throw new BadRequestException(HttpErrorConstants.INVALID_PUSH_TOKEN);
    }

    this.logger.error(`FCM Error in ${method}`, {
      error,
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
