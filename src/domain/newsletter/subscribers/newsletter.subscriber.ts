import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DataSource,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { Newsletter } from '../entities/newsletter.entity';

@Injectable()
export class NewsletterSubscriber
  implements EntitySubscriberInterface<Newsletter>
{
  private readonly logger = new Logger(NewsletterSubscriber.name);
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
    return Newsletter;
  }

  async afterInsert(event: InsertEvent<Newsletter>) {
    this.logger.debug(`Newsletter ${event.entity.id} created`);
    // TODO: Newsletter는 이제 단순 콘텐츠 저장용
    // 발송 로직은 Notifiable entity 및 NotifiableService로 이관 필요
  }

  async afterUpdate(event: UpdateEvent<Newsletter>) {
    this.logger.debug(`Newsletter ${event.entity?.id} updated`);
    // TODO: 발송 로직은 Notifiable로 이관 필요
  }
}
