import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DataSource,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { Reminder } from '../entities/reminder.entity';

@Injectable()
export class ReminderSubscriber
  implements EntitySubscriberInterface<Reminder>
{
  private readonly logger = new Logger(ReminderSubscriber.name);
  private readonly domain: string;

  constructor(
    dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    dataSource.subscribers.push(this);
    this.domain =
      this.configService.get('nodeEnv') === 'prod'
        ? 'https://스쿨허브.kr'
        : 'https://dev.스쿨허브.kr';
  }

  listenTo() {
    return Reminder;
  }

  async afterInsert(event: InsertEvent<Reminder>) {
    this.logger.debug(`Reminder ${event.entity.id} created`);
    // TODO: Reminder는 단순 콘텐츠 저장용
    // 발송 로직은 Notifiable entity 및 NotifiableService로 이관 필요
  }

  async afterUpdate(event: UpdateEvent<Reminder>) {
    this.logger.debug(`Reminder ${event.entity?.id} updated`);
    // TODO: 발송 로직은 Notifiable로 이관 필요
  }
}

