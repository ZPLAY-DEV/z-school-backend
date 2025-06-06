import { FirehoseClient, PutRecordCommand } from '@aws-sdk/client-firehose';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FirehoseService {
  private readonly logger = new Logger(FirehoseService.name);
  private readonly client: FirehoseClient;
  private readonly deliveryStreamName =
    process.env.FIREHOSE_STREAM_NAME || 'fcm-log-stream';

  constructor() {
    this.client = new FirehoseClient({ region: process.env.AWS_REGION });
  }

  async sendRecord(data: Record<string, any>) {
    const payload = Buffer.from(JSON.stringify(data));
    const command = new PutRecordCommand({
      DeliveryStreamName: this.deliveryStreamName,
      Record: { Data: payload },
    });

    try {
      const response = await this.client.send(command);
      this.logger.log(`Record sent to Firehose: ${JSON.stringify(response)}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to send to Firehose: ${error}`);
      throw error;
    }
  }
}
