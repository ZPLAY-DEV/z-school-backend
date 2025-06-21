import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { NewsletterController } from 'src/domain/newsletter/newsletter.controller';
import { NewsletterService } from 'src/domain/newsletter/newsletter.service';
import { Shortlink } from 'src/domain/shortlink/entities/shortlink.entity';
import { SqsModule } from 'src/services/aws/sqs.module';
import { RedisModule } from 'src/services/redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Newsletter, Shortlink]),
    SqsModule,
    RedisModule,
  ],
  controllers: [NewsletterController],
  providers: [NewsletterService],
})
export class NewsletterModule {}
