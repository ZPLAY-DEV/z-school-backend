import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { DynamooseModule } from 'nestjs-dynamoose';
import { NotificationSchema } from './entities/notification.schema';
import { SqsModule } from 'src/services/aws/sqs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    DynamooseModule.forFeature([
      {
        name: 'Notification',
        schema: NotificationSchema,
        options: {
          tableName: 'notification',
        },
      },
    ]),
    SqsModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
})
export class NotificationModule {}
