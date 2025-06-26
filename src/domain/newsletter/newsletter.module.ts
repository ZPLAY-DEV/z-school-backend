import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DynamooseModule } from 'nestjs-dynamoose';
import { EventSchema } from 'src/domain/event/entities/event.schema';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { NewsletterController } from 'src/domain/newsletter/newsletter.controller';
import { NewsletterService } from 'src/domain/newsletter/newsletter.service';
import { Shortlink } from 'src/domain/shortlink/entities/shortlink.entity';
import { SqsModule } from 'src/services/aws/sqs.module';
import { RedisModule } from 'src/services/redis/redis.module';
import { SlackModule } from 'src/services/slack/slack.module';
import { UploadModule } from 'src/services/upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Newsletter, Shortlink]),
    DynamooseModule.forFeature([
      {
        name: 'Event',
        schema: EventSchema,
        options: {
          tableName: 'event', // e.g. local_event_table
        },
      },
    ]),
    UploadModule,
    SqsModule,
    RedisModule,
    SlackModule,
  ],
  controllers: [NewsletterController],
  providers: [NewsletterService],
})
export class NewsletterModule {}
