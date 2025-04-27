import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { AWS_SQS_OPTIONS } from 'src/common/constants';

@Injectable()
export class SqsService implements OnModuleInit {
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
    try {
      console.log(
        `✅ AWS SQS service initialized for region: ${this.sqsOptions.region}`,
      );
    } catch (error) {
      console.error('❌ Failed to initialize AWS SQS service:', error);
    }
  }

  async sendMessage(payload: any): Promise<void> {
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
