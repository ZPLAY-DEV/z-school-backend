import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AWS_SQS_CLIENT, AWS_SQS_OPTIONS } from 'src/common/constants';
import { SqsService } from 'src/services/aws/sqs.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: AWS_SQS_OPTIONS,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        region:
          configService.get<string>('aws.defaultRegion') || 'ap-northeast-2',
        accessKeyId:
          configService.get<string>('aws.accessKey') || 'your-access-key',
        secretAccessKey:
          configService.get<string>('aws.secretAccessKey') || 'your-secret-key',
        sqsEndpoint:
          configService.get<string>('aws.sqsEndpoint') || 'your-sqs-endpoint',
        queueUrl:
          configService.get<string>('aws.sqsPrimaryUrl') || 'your-queue-url',
      }),
    },
    SqsService,
    {
      provide: AWS_SQS_CLIENT,
      useExisting: SqsService,
    },
  ],
  exports: [AWS_SQS_CLIENT, SqsService],
})
export class SqsModule {}
