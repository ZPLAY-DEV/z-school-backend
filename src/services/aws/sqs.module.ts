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
          configService.get<string>('AWS_DEFAULT_REGION') || 'ap-northeast-2',
        accessKeyId:
          configService.get<string>('AWS_ACCESS_KEY_ID') || 'your-access-key',
        secretAccessKey:
          configService.get<string>('AWS_SECRET_ACCESS_KEY') ||
          'your-secret-key',
        queueUrl:
          configService.get<string>('AWS_SQS_QUEUE_URL') || 'your-queue-url',
      }),
    },
  ],
  exports: [SqsService],
})
export class SqsModule {}
