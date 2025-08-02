import { Inject, Injectable, Logger } from '@nestjs/common';
import { AWS_SQS_CLIENT } from 'src/common/constants';
import { SqsService } from 'src/services/aws/sqs.service';
import { MultiMixedMessages } from 'src/services/notification/types';

//! invalid token nullify 는 node sqs handler 에서 처러.
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(AWS_SQS_CLIENT)
    private readonly sqsClient: SqsService,
  ) {}

  async send(data: MultiMixedMessages): Promise<{
    success: boolean;
  }> {
    try {
      await this.sqsClient.sendMessage({
        type: 'SEND_MESSAGES',
        data,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to send message to SQS', error);
      return { success: false };
    }
  }

  async text(data: { body: string; phone: string }): Promise<{
    success: boolean;
  }> {
    try {
      await this.sqsClient.sendMessage({
        type: 'SEND_TEXT',
        data,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to send message to SQS', error);
      return { success: false };
    }
  }
}
