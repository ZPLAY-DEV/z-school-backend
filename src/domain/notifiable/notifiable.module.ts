import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notifiable } from 'src/domain/notifiable/entities/notifiable.entity';
import { Recipient } from 'src/domain/notifiable/entities/recipient.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { NotifiableController } from './notifiable.controller';
import { NotifiableService } from './notifiable.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notifiable, Recipient, Student])],
  controllers: [NotifiableController],
  providers: [NotifiableService],
  exports: [NotifiableService],
})
export class NotifiableModule {}
