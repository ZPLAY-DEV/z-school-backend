import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SqsService {
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;

  constructor(@Inject(ConfigService) private configService: ConfigService) {
    const region = this.configService.get<string>('aws.defaultRegion');
    const accessKeyId = this.configService.get<string>('aws.accessKey');
    const secretAccessKey = this.configService.get<string>(
      'aws.secretAccessKey',
    );

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error('Missing AWS credentials or region');
    }

    this.sqsClient = new SQSClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    this.queueUrl = this.configService.get<string>('AWS_SQS_QUEUE_URL') ?? '';
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
