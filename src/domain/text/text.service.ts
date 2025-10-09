import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NotifiableSourceType } from 'src/common/enums';
import { Student } from 'src/domain/student/entities/student.entity';
import {
  getTemplateOfNewsSchedule,
  getTemplateOfRegistration,
} from 'src/helpers/get-message-body';
import { NotificationService } from 'src/services/notification/notification.service';
import { NotificationSendResult } from 'src/services/notification/types';
import { Repository } from 'typeorm';
@Injectable()
export class TextService {
  private readonly logger = new Logger(TextService.name);

  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    private readonly notificationService: NotificationService,
  ) {}

  // ------------------------------------------------------------------------ //
  // Notification API
  // ------------------------------------------------------------------------ //

  async sendNotification(
    id: number,
    dto: {
      school: string;
      term: string;
      title: string;
      shortlink: string;
    },
  ): Promise<NotificationSendResult> {
    const student = await this.studentRepository.findOne({
      where: { id },
      relations: ['parent', 'parent.user'],
    });
    if (!student) {
      throw new NotFoundException('Student not found.');
    }

    const body = getTemplateOfNewsSchedule(dto);
    const data = {
      type: NotifiableSourceType.OTHER,
      schoolId: 1,
      messages: [
        {
          token: student.parent.user?.pushToken ?? null,
          phone: student.parent.phone,
          template: 'NewsClassChanges1',
          body: body,
          role: 'PARENT',
          url: dto.shortlink,
        },
      ],
    };

    return await this.notificationService.send(data);
  }

  async sendRegistration(
    id: number,
    dto: {
      school: string;
      term: string;
      period: string;
      shortlink: string;
    },
  ): Promise<NotificationSendResult> {
    const student = await this.studentRepository.findOne({
      where: { id },
      relations: ['parent', 'parent.user'],
    });
    if (!student) {
      throw new NotFoundException('Student not found.');
    }

    const body = getTemplateOfRegistration(dto);
    const data = {
      type: NotifiableSourceType.REMINDER,
      schoolId: 1,
      messages: [
        {
          token: student.parent.user?.pushToken ?? null,
          phone: student.parent.phone,
          template: 'Registration1',
          body: body,
          role: 'PARENT',
          url: dto.shortlink,
        },
      ],
    };

    return await this.notificationService.send(data);
  }
}
