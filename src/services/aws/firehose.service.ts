import {
  FirehoseClient,
  PutRecordBatchCommand,
  PutRecordCommand,
} from '@aws-sdk/client-firehose';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

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
  private readonly maxBatchSize = 500; // Firehose limit is 500 records per batch

  constructor() {
    // Validate required environment variables
    const region = process.env.AWS_DEFAULT_REGION;
    const streamName = process.env.AWS_FIREHOSE_STREAM_NAME;

    if (!region) {
      throw new Error('AWS_REGION environment variable is required');
    }

    if (!streamName) {
      throw new Error('FIREHOSE_STREAM_NAME environment variable is required');
    }

    this.deliveryStreamName = streamName;

    // AWS 인증 정보 설정
    const credentials =
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined; // AWS SDK가 기본 credential chain 사용 (IAM role, AWS profile 등)

    // LocalStack 엔드포인트 설정
    const endpoint = process.env.AWS_FIREHOSE_ENDPOINT;

    this.client = new FirehoseClient({
      region,
      maxAttempts: this.maxRetries,
      ...(credentials && { credentials }),
      ...(endpoint && { endpoint }),
    });
  }

  onModuleInit() {
    this.logger.log(
      `✅ Firehose service initialized - Stream: ${this.deliveryStreamName}, Region: ${process.env.AWS_REGION}`,
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
   * Send multiple records to Firehose in batches
   */
  async sendRecords(records: FirehoseRecord[]): Promise<FirehoseBatchResult> {
    if (records.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    const startTime = Date.now();
    let totalSuccessCount = 0;
    let totalFailureCount = 0;
    const allFailedRecords: FirehoseRecord[] = [];

    try {
      // Split records into batches
      const batches = this.chunkArray(records, this.maxBatchSize);

      this.logger.log(
        `Sending ${records.length} records in ${batches.length} batch(es) to Firehose`,
      );

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        this.logger.debug(
          `Processing batch ${i + 1}/${batches.length} with ${batch.length} records`,
        );

        try {
          const result = await this.sendBatch(batch);
          totalSuccessCount += result.successCount;
          totalFailureCount += result.failureCount;

          if (result.failedRecords) {
            allFailedRecords.push(...result.failedRecords);
          }

          // Small delay between batches to avoid rate limiting
          if (i < batches.length - 1) {
            await this.delay(100);
          }
        } catch (error) {
          this.logger.error(`Batch ${i + 1} failed completely:`, error);
          totalFailureCount += batch.length;
          allFailedRecords.push(...batch);
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Batch processing completed (${duration}ms) - Success: ${totalSuccessCount}, Failure: ${totalFailureCount}`,
      );

      return {
        successCount: totalSuccessCount,
        failureCount: totalFailureCount,
        failedRecords:
          allFailedRecords.length > 0 ? allFailedRecords : undefined,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Batch processing failed completely (${duration}ms)`,
        error,
      );
      throw error;
    }
  }

  /**
   * Send a single batch to Firehose
   */
  private async sendBatch(
    records: FirehoseRecord[],
  ): Promise<FirehoseBatchResult> {
    try {
      const requestEntries = records.map((record) => {
        this.validateRecord(record);
        return {
          Data: Buffer.from(JSON.stringify(record) + '\n'), // Add newline for proper JSON Lines format
        };
      });

      const command = new PutRecordBatchCommand({
        DeliveryStreamName: this.deliveryStreamName,
        Records: requestEntries,
      });

      const response = await this.executeWithRetry(async () => {
        return await this.client.send(command);
      });

      const successCount =
        response.RequestResponses?.filter((r) => !r.ErrorCode).length || 0;
      const failureCount =
        (response.RequestResponses?.length || 0) - successCount;

      // Collect failed records
      const failedRecords: FirehoseRecord[] = [];
      if (response.RequestResponses) {
        response.RequestResponses.forEach((resp, index) => {
          if (resp.ErrorCode) {
            failedRecords.push(records[index]);
            this.logger.warn(
              `Record ${index} failed: ${resp.ErrorCode} - ${resp.ErrorMessage}`,
            );
          }
        });
      }

      return {
        successCount,
        failureCount,
        failedRecords: failedRecords.length > 0 ? failedRecords : undefined,
      };
    } catch (error) {
      this.logger.error(`Batch send failed:`, error);
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
          const delay = this.retryDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
          this.logger.warn(
            `Firehose operation attempt ${attempt} failed, retrying in ${delay}ms: ${error.message}`,
          );
          await this.delay(delay);
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

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
