import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DynamoService implements OnModuleInit {
  private readonly logger = new Logger(DynamoService.name);
  private readonly ddb: DynamoDBClient;
  private readonly docClient: DynamoDBDocumentClient;
  private readonly region: string;

  constructor(@Inject(ConfigService) private configService: ConfigService) {
    this.region =
      this.configService.get<string>('aws.defaultRegion') ?? 'ap-northeast-2';
    const accessKey = this.configService.get<string>('aws.accessKey') ?? 'test';
    const secretAccessKey =
      this.configService.get<string>('aws.secretAccessKey') ?? 'test';

    // 🐛 디버깅을 위한 환경변수 로깅
    console.log('🔍 DynamoService Environment Variables:');
    console.log(
      `  ConfigService aws.defaultRegion: ${this.configService.get<string>('aws.defaultRegion')}`,
    );
    console.log(
      `  ConfigService aws.accessKey: ${this.configService.get<string>('aws.accessKey')}`,
    );
    console.log(
      `  ConfigService aws.secretAccessKey: ${this.configService.get<string>('aws.secretAccessKey') ? '***MASKED***' : 'undefined'}`,
    );
    console.log(`  Final region: ${this.region}`);
    console.log(`  Final accessKey: ${accessKey}`);
    console.log(
      `  Final secretAccessKey: ${secretAccessKey ? '***MASKED***' : 'undefined'}`,
    );

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

  onModuleInit() {
    this.logger.log(
      `AWS DynamoDB service initialized for region: ${this.region}`,
    );
  }

  getClient(): DynamoDBDocumentClient {
    return this.docClient;
  }

  async send(command: any): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return await this.docClient.send(command);
  }
}
