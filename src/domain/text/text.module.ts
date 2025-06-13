import { Module } from '@nestjs/common';
import { AligoModule } from 'src/services/aligo/aligo.module';
import { SqsModule } from 'src/services/aws/sqs.module';
import { NotificationModule } from 'src/services/notification/notification.module';
import { TextController } from './text.controller';
import { TextService } from './text.service';

@Module({
  imports: [NotificationModule, AligoModule, SqsModule],
  controllers: [TextController],
  providers: [TextService],
})
export class TextModule {}
