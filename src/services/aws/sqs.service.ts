import {
  GetQueueAttributesCommand,
  SQSClient,
  SQSClientConfig,
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
      accessKeyId?: string;
      secretAccessKey?: string;
      sqsEndpoint?: string;
      sqsPqUrl: string;
      sqsDlqUrl: string;
    },
  ) {
    const endpoint = sqsOptions.sqsEndpoint;

    // AWS SDK가 자동으로 IAM 역할을 사용하도록 credentials 제거
    // LocalStack 환경에서만 endpoint와 credentials 사용
    const sqsConfig: SQSClientConfig = {
      region: sqsOptions.region,
    };

    if (endpoint) {
      // LocalStack 환경
      sqsConfig.endpoint = endpoint;
      if (sqsOptions.accessKeyId && sqsOptions.secretAccessKey) {
        sqsConfig.credentials = {
          accessKeyId: sqsOptions.accessKeyId,
          secretAccessKey: sqsOptions.secretAccessKey,
        };
      }
    }
    // AWS 환경에서는 IAM 역할 자동 사용 (credentials 없음)

    this.sqsClient = new SQSClient(sqsConfig);
    this.queueUrl = sqsOptions.sqsPqUrl;
  }

  onModuleInit() {
    this.logger.log(
      `AWS SQS service initialized for region: ${this.sqsOptions.region}`,
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

  //! 미 사용
  async updateQueuePolicy(ruleArn: string): Promise<void> {
    try {
      //? 기존 정책 가져오기
      const getAttributesCommand = new GetQueueAttributesCommand({
        QueueUrl: this.queueUrl,
        AttributeNames: ['Policy'],
      });
      const { Attributes } = await this.sqsClient.send(getAttributesCommand);
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
