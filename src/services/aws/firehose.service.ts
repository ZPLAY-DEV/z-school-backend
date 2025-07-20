import { FirehoseClient, PutRecordCommand } from '@aws-sdk/client-firehose';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { delay } from 'src/helpers/time';

export interface FirehoseRecord {
  [key: string]: any;
}

export interface FirehoseBatchResult {
  successCount: number;
  failureCount: number;
  failedRecords?: FirehoseRecord[];
}

@Injectable()
export class FirehoseService implements OnModuleInit {
  private readonly logger = new Logger(FirehoseService.name);
  private readonly client: FirehoseClient;
  private readonly deliveryStreamName: string;
  private readonly maxRetries = 3;
  private readonly retryDelayMs = 1000;

  constructor(private readonly configService: ConfigService) {
    // Validate required environment variables
    const region =
      this.configService.get<string>('aws.defaultRegion') ?? 'ap-northeast-2';
    const accessKey = this.configService.get<string>('aws.accessKey');
    const secretAccessKey = this.configService.get<string>(
      'aws.secretAccessKey',
    );
    const endpoint = this.configService.get<string>('aws.firehoseEndpoint');
    const credentials =
      accessKey && secretAccessKey
        ? {
            accessKeyId: accessKey,
            secretAccessKey: secretAccessKey,
          }
        : undefined; // AWS SDK가 기본 credential chain 사용 (IAM role, AWS profile 등)

    this.deliveryStreamName =
      this.configService.get<string>('aws.firehoseStreamName') ||
      'notification-logs-stream';

    this.client = new FirehoseClient({
      region,
      maxAttempts: this.maxRetries,
      ...(credentials && { credentials }),
      ...(endpoint && { endpoint }),
    });
  }

  onModuleInit() {
    this.logger.log(
      `Firehose service initialized for stream: ${this.deliveryStreamName}`,
    );
  }

  /**
   * Send a single record to Firehose with retry logic
   */
  async sendRecord(data: FirehoseRecord): Promise<any> {
    const startTime = Date.now();

    try {
      this.validateRecord(data);

      const payload = Buffer.from(JSON.stringify(data) + '\n'); // Add newline for proper JSON Lines format
      const command = new PutRecordCommand({
        DeliveryStreamName: this.deliveryStreamName,
        Record: { Data: payload },
      });

      const response = await this.executeWithRetry(async () => {
        return await this.client.send(command);
      });

      const duration = Date.now() - startTime;
      this.logger.log(
        `Record sent to Firehose successfully (${duration}ms) - RecordId: ${response.RecordId}`,
      );

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to send record to Firehose after ${this.maxRetries} attempts (${duration}ms)`,
        {
          error: error.message,
          stack: error.stack,
          streamName: this.deliveryStreamName,
          dataSize: JSON.stringify(data).length,
        },
      );
      throw error;
    }
  }
  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (this.isRetryableError(error) && attempt < this.maxRetries) {
          const delayMs = this.retryDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
          this.logger.warn(
            `Firehose operation attempt ${attempt} failed, retrying in ${delayMs}ms: ${error.message}`,
          );
          await delay(delayMs);
        } else {
          break;
        }
      }
    }

    throw lastError;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryableErrors = [
      'ServiceUnavailableException',
      'ThrottlingException',
      'InternalServerError',
      'RequestTimeoutException',
      'NetworkingError',
    ];

    return retryableErrors.some(
      (errorType) =>
        error.name === errorType ||
        error.code === errorType ||
        error.message?.includes(errorType),
    );
  }

  /**
   * Validate record data
   */
  private validateRecord(data: FirehoseRecord): void {
    if (!data || typeof data !== 'object') {
      throw new Error('Record data must be a non-null object');
    }

    const serialized = JSON.stringify(data);
    const sizeInBytes = Buffer.byteLength(serialized, 'utf8');

    // Firehose record size limit is 1000 KB
    if (sizeInBytes > 1000 * 1024) {
      throw new Error(
        `Record size (${sizeInBytes} bytes) exceeds Firehose limit (1000 KB)`,
      );
    }
  }
}
