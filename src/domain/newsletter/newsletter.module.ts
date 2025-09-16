import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { Shortlink } from 'src/domain/newsletter/entities/shortlink.entity';
import { NewsletterController } from 'src/domain/newsletter/newsletter.controller';
import { NewsletterService } from 'src/domain/newsletter/newsletter.service';
import { NewsletterSubscriber } from 'src/domain/newsletter/subscribers/newsletter.subscriber';
import { School } from 'src/domain/school/entities/school.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { SqsModule } from 'src/services/aws/sqs.module';
import { NotificationModule } from 'src/services/notification/notification.module';
import { RedisModule } from 'src/services/redis/redis.module';
import { UploadModule } from 'src/services/upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Newsletter, Shortlink, School, Term]),
    UploadModule,
    SqsModule,
    RedisModule,
    NotificationModule,
  ],
  providers: [NewsletterService, NewsletterSubscriber],
  controllers: [NewsletterController],
})
export class NewsletterModule {}
