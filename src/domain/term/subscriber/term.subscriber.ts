import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Group } from 'src/domain/group/entities/group.entity';
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

//? 1. term 의 bookingStart 가 처음 설정될 때 해야할 일
//?  - 모든 Term > Lesson > Group 에 대해서 Offering 생성
//?  - set isOfferingReady to true
//?  - Slack 알림 발송
//! 2. term 의 start 또는 end 가 변경될 때 아래 작업이 필요하지만, 미구현
//!  - 모든 Term > Lesson 에 대해서 start, end 변경
//!  - 모든 Term > Pick 에 대해서 start, end 변경
//!  - 모든 Term > Contract 에 대해서 start, end 변경
//!  - 모든 Term > Schoolday 에 대해서 start, end 변경
@Injectable()
export class TermSubscriber implements EntitySubscriberInterface<Term> {
  private readonly logger = new Logger(TermSubscriber.name);
  private readonly environment: string;
  private readonly appUrl: string;

  constructor(
    dataSource: DataSource,
    private readonly slack: SlackService,
    private readonly configService: ConfigService,
  ) {
    dataSource.subscribers.push(this);
    this.environment = this.configService.get<string>('nodeEnv', 'dev');
    this.appUrl = this.configService.get<string>(
      'appUrl',
      'http://localhost:3000',
    );
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
      //? offerings 생성하기
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
    const previousTerm = event.databaseEntity;

    const newBookingStart = term?.bookingStart;
    const oldBookingStart = previousTerm?.bookingStart;

    // bookingStart 가 처음 설정될 때 해야할 일
    // 1. 모든 Term > Lesson > Group 에 대해서 Offering 생성
    // 2. set isOfferingReady to true
    // 3. Slack 알림 발송
    if (term && oldBookingStart === null && newBookingStart !== null) {
      try {
        //? offerings 생성하기
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
      term.pickRule,
      schoolId,
      lessons as Lesson[],
    );

    // Offering 저장
    const savedOfferings = await manager
      .getRepository(Offering)
      .save(offerings);

    // 각 Group의 offeringId 설정
    for (const offering of savedOfferings) {
      for (const groupId of offering.groupIds) {
        await manager
          .getRepository(Group)
          .update(groupId, { offeringId: offering.id });
      }
    }
  }

  /**
   * Send term registration notification to Slack
   */
  private async sendTermRegistrationNotification(term: Term): Promise<void> {
    const termId = term.id;
    const termName = term.termName;
    await this.slack.sendMessage({
      channel: 'activity',
      text: `[${this.environment}-api] 🥳 Term 수강신청일 등록 : <${this.appUrl}/terms/${termId}|${termName}>`,
    });
  }
}
