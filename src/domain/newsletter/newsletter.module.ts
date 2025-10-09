import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { NewsletterController } from 'src/domain/newsletter/newsletter.controller';
import { NewsletterService } from 'src/domain/newsletter/newsletter.service';
import { Notifiable } from 'src/domain/notifiable/entities/notifiable.entity';
import { Recipient } from 'src/domain/notifiable/entities/recipient.entity';
import { NotifiableModule } from 'src/domain/notifiable/notifiable.module';
import { School } from 'src/domain/school/entities/school.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { SqsModule } from 'src/services/aws/sqs.module';
import { NotificationModule } from 'src/services/notification/notification.module';
import { RedisModule } from 'src/services/redis/redis.module';
import { UploadModule } from 'src/services/upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Newsletter,
      Notifiable,
      Recipient,
      School,
      Student,
      Term,
    ]),
    forwardRef(() => NotifiableModule),
    UploadModule,
    SqsModule,
    RedisModule,
    NotificationModule,
  ],
  providers: [NewsletterService],
  controllers: [NewsletterController],
})
export class NewsletterModule {}
