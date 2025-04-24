import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AWS_SQS_OPTIONS } from 'src/common/constants';
import { SqsService } from 'src/services/aws/sqs.service';

@Module({
  imports: [ConfigModule],
  providers: [
    SqsService,
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
        queueUrl:
          configService.get<string>('aws.sqsPrimaryUrl') || 'your-queue-url',
      }),
    },
  ],
  exports: [SqsService],
})
export class SqsModule {}
