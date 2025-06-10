import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AWS_SQS_OPTIONS } from 'src/common/constants';

@Injectable()
export class SqsService implements OnModuleInit {
  private readonly logger = new Logger(SqsService.name);
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;

  constructor(
    @Inject(AWS_SQS_OPTIONS)
    private readonly sqsOptions: {
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
      sqsEndpoint: string;
      queueUrl: string;
    },
  ) {
    this.sqsClient = new SQSClient({
      region: sqsOptions.region,
      endpoint: sqsOptions.sqsEndpoint,
      credentials: {
        accessKeyId: sqsOptions.accessKeyId,
        secretAccessKey: sqsOptions.secretAccessKey,
      },
    });
    this.queueUrl = sqsOptions.queueUrl;
  }

  onModuleInit() {
    this.logger.log(
      `AWS SQS service initialized for endpoint: ${this.sqsOptions.sqsEndpoint}`,
    );
  }

  async sendMessage(payload: { type: string; data: any }): Promise<void> {
    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(payload),
    });

    try {
      await this.sqsClient.send(command);
    } catch (error) {
      throw new Error(`Failed to send message to SQS: ${error.message}`);
    }
  }
}
