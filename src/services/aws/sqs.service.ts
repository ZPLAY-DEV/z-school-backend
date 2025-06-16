import {
  GetQueueAttributesCommand,
  SQSClient,
  SendMessageCommand,
  SetQueueAttributesCommand,
} from '@aws-sdk/client-sqs';
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

  async updateQueuePolicy(ruleArn: string): Promise<void> {
    try {
      //? 기존 정책 가져오기
      const getAttributesCommand = new GetQueueAttributesCommand({
        QueueUrl: this.queueUrl,
        AttributeNames: ['Policy'],
      });
      console.log('getAttributesCommand', getAttributesCommand);

      const { Attributes } = await this.sqsClient.send(getAttributesCommand);
      console.log('Attributes', Attributes);

      const policy = Attributes?.Policy
        ? JSON.parse(Attributes.Policy)
        : {
            Version: '2012-10-17',
            Id: `${this.queueUrl}/EventBridgePolicy`,
            Statement: [],
          };

      //? EventBridge 권한 추가
      const statement = {
        Sid: `EventBridge-${ruleArn.split('/').pop()}`,
        Effect: 'Allow',
        Principal: { Service: 'events.amazonaws.com' },
        Action: 'sqs:SendMessage',
        Resource: this.queueUrl,
        Condition: { ArnEquals: { 'aws:SourceArn': ruleArn } },
      };

      //? 중복 정책 체킹
      if (!policy.Statement.some((s: any) => s.Sid === statement.Sid)) {
        policy.Statement.push(statement);
      }

      //? 정책 업데이트
      const setAttributesCommand = new SetQueueAttributesCommand({
        QueueUrl: this.queueUrl,
        Attributes: { Policy: JSON.stringify(policy) },
      });
      await this.sqsClient.send(setAttributesCommand);
      this.logger.log(
        `Updated SQS policy for ${this.queueUrl} with rule ${ruleArn}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update SQS policy for ${this.queueUrl}: ${error.message}`,
      );
      throw new Error(`Failed to update SQS policy: ${error.message}`);
    }
  }
}
