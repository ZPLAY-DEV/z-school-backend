import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DynamoService {
  private readonly ddb: DynamoDBClient;
  private readonly docClient: DynamoDBDocumentClient;
  private readonly region: string;

  constructor(@Inject(ConfigService) private configService: ConfigService) {
    this.region =
      this.configService.get<string>('aws.defaultRegion') ?? 'ap-northeast-2';
    const accessKey = this.configService.get<string>('aws.accessKey') ?? 'test';
    const secretAccessKey =
      this.configService.get<string>('aws.secretAccessKey') ?? 'test';

    this.ddb = new DynamoDBClient({
      region: this.region,
      endpoint: 'http://localhost:4566',
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretAccessKey,
      },
    });
    this.docClient = DynamoDBDocumentClient.from(this.ddb);
  }

  getClient(): DynamoDBDocumentClient {
    return this.docClient;
  }

  async send(command: any): Promise<any> {
    return await this.docClient.send(command);
  }
}
