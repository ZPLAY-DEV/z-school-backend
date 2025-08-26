import { Module } from '@nestjs/common';
import { AligoModule } from 'src/services/aligo/aligo.module';
import { SqsModule } from 'src/services/aws/sqs.module';
import { SensModule } from 'src/services/ncloud/sens.module';
import { SensService } from 'src/services/ncloud/sens.service';
import { NotificationModule } from 'src/services/notification/notification.module';
import { TextController } from './text.controller';
import { TextService } from './text.service';

@Module({
  imports: [NotificationModule, SensModule, AligoModule, SqsModule],
  controllers: [TextController],
  providers: [TextService, SensService],
})
export class TextModule {}
