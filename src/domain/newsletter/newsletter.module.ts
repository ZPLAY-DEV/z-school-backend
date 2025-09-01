import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dispatch } from 'src/domain/newsletter/entities/dispatch.entity';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { Shortlink } from 'src/domain/newsletter/entities/shortlink.entity';
import { NewsletterDispatchController } from 'src/domain/newsletter/newsletter-dispatch.controller';
import { NewsletterDispatchService } from 'src/domain/newsletter/newsletter-dispatch.service';
import { NewsletterController } from 'src/domain/newsletter/newsletter.controller';
import { NewsletterService } from 'src/domain/newsletter/newsletter.service';
import { School } from 'src/domain/school/entities/school.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { SqsModule } from 'src/services/aws/sqs.module';
import { RedisModule } from 'src/services/redis/redis.module';
import { UploadModule } from 'src/services/upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dispatch, Newsletter, Shortlink, School, Term]),
    UploadModule,
    SqsModule,
    RedisModule,
  ],
  controllers: [NewsletterController, NewsletterDispatchController],
  providers: [NewsletterService, NewsletterDispatchService],
})
export class NewsletterModule {}
