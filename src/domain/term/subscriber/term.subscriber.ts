import { Injectable, Logger } from '@nestjs/common';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { makeOfferingsFromLessons } from 'src/helpers/offering.util';
import { SlackService } from 'src/services/slack/slack.service';
import {
  DataSource,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';

@Injectable()
export class TermSubscriber implements EntitySubscriberInterface<Term> {
  private readonly logger = new Logger(TermSubscriber.name);

  constructor(
    dataSource: DataSource,
    private readonly slack: SlackService,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo(): any {
    return Term;
  }

  //! https://github.com/typeorm/typeorm/issues/3563
  //! you need to use the same entityManager instance because of transactions.
  //! which means event.manager. not event.connection.manager.

  async afterInsert(event: InsertEvent<Term>) {
    const term = event.entity;

    // bookingStart 가 처음 설정될 때 해야할 일
    // 1. 모든 Term > Lesson > Group 에 대해서 Offering 생성
    // 2. set isOfferingReady to true
    // 3. Slack 알림 발송
    if (term && term.bookingStart && term.bookingEnd) {
      // todo. offerings 생성하기
      await this.makeOfferings(term, event.manager);
      await event.manager
        .createQueryBuilder()
        .update('Term')
        .set({
          isOfferingReady: true,
        })
        .where('id = :termId', { termId: term.id })
        .execute();

      // 💥 fire and forget) 1. Slack notification
      this.sendTermRegistrationNotification(term).catch((error) => {
        this.logger.warn('Failed to send Slack notification', error);
      });

      // 💥 fire and forget) 2. 고객에게 확인 이메일
      // await this.ses.sendOrderConfirmationEmail(order.user.email, order);
    }
  }

  async afterUpdate(event: UpdateEvent<Term>) {
    const term = event.entity as Term;
    const oldStatus = event.databaseEntity?.bookingStart;
    const newStatus = term?.bookingStart;

    // bookingStart 가 처음 설정될 때 해야할 일
    // 1. 모든 Term > Lesson > Group 에 대해서 Offering 생성
    // 2. set isOfferingReady to true
    // 3. Slack 알림 발송
    if (term && oldStatus === null && newStatus !== null) {
      // todo. offerings 생성하기
      try {
        await this.makeOfferings(term, event.manager);
      } catch (error) {
        this.logger.error('Failed to make offerings', error);
      }
      await event.manager
        .createQueryBuilder()
        .update('Term')
        .set({
          isOfferingReady: true,
        })
        .where('id = :termId', { termId: term.id })
        .execute();

      // 💥 fire and forget) 1. Slack notification
      this.sendTermRegistrationNotification(term).catch((error) => {
        this.logger.warn('Failed to send Slack notification', error);
      });

      // 💥 fire and forget) 2. 고객에게 확인 이메일
      // await this.ses.sendOrderConfirmationEmail(order.user.email, order);
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Helpers
  //? ---------------------------------------------------------------------- ?//

  private async makeOfferings(term: Term, manager): Promise<void> {
    const lessons = await manager
      .getRepository(Lesson)
      .createQueryBuilder('lesson')
      .leftJoinAndSelect('lesson.groups', 'group')
      .where('lesson.termId = :termId', { termId: term.id })
      .orderBy('lesson.id', 'ASC')
      .getMany();

    if (!lessons.length) return;
    const schoolId = lessons[0]?.schoolId as number;
    const offerings = makeOfferingsFromLessons(
      term.id,
      schoolId,
      lessons as Lesson[],
    );
    await manager.getRepository(Offering).save(offerings);
  }

  /**
   * Send term registration notification to Slack
   */
  private async sendTermRegistrationNotification(term: Term): Promise<void> {
    if (process.env.NODE_ENV !== 'development') {
      const termId = term.id;
      const termName = term.termName;
      await this.slack.sendMessage({
        channel: 'activity',
        text: `[${process.env.NODE_ENV}-api] 🥳 Term 수강신청일 등록 : <${process.env.APP_URL}/terms/${termId}|${termName}>`,
      });
    }
  }
}
