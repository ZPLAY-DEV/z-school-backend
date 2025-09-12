import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from 'src/domain/student/entities/student.entity';
import { AligoModule } from 'src/services/aligo/aligo.module';
import { SensService } from 'src/services/ncloud/sens.service';
import { NotificationModule } from 'src/services/notification/notification.module';
import { TextController } from './text.controller';
import { TextService } from './text.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Student]),
    NotificationModule,
    AligoModule,
  ],
  providers: [TextService, SensService],
  controllers: [TextController],
})
export class TextModule {}
