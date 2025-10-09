import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notifiable } from 'src/domain/notifiable/entities/notifiable.entity';
import { Recipient } from 'src/domain/notifiable/entities/recipient.entity';
import { NotifiableModule } from 'src/domain/notifiable/notifiable.module';
import { Reminder } from 'src/domain/reminder/entities/reminder.entity';
import { ReminderController } from 'src/domain/reminder/reminder.controller';
import { ReminderService } from 'src/domain/reminder/reminder.service';
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
      Reminder,
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
  providers: [ReminderService],
  controllers: [ReminderController],
})
export class ReminderModule {}

