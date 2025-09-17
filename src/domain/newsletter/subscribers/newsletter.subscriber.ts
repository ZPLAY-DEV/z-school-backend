import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { nanoid } from 'nanoid';
import { NewsletterType } from 'src/common/enums';
import { SendStatus } from 'src/common/enums/send-status';
import { CreateShortlinkDto } from 'src/domain/newsletter/dto/create-shortlink.dto';
import { Student } from 'src/domain/student/entities/student.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { chunk } from 'src/helpers/array';
import {
  getTemplateOfNewsChanges,
  getTemplateOfNewsSchedules,
  getTemplateOfNewsSupplies,
  getTemplateOfRegistration,
} from 'src/helpers/get-message-body';
import { NotificationCoreData } from 'src/services/notification/types';
import {
  DataSource,
  EntityManager,
  EntitySubscriberInterface,
  In,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { Newsletter } from '../entities/newsletter.entity';
import { Shortlink } from '../entities/shortlink.entity';

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
    const newsletter = event.entity;

    // studentIds가 있고, payload가 없는 경우에만 shortlinks 생성
    if (newsletter.studentIds && newsletter.studentIds.length > 0) {
      try {
        await this._generateShortlinks(newsletter, event.manager);
      } catch (error) {
        this.logger.error(
          `Failed to process shortlinks for newsletter ${newsletter.id}:`,
          error,
        );
      }
    }
  }

  async afterUpdate(event: UpdateEvent<Newsletter>) {
    const newsletter = event.entity as Newsletter;
    const previousNewsletter = event.databaseEntity;

    if (
      newsletter &&
      previousNewsletter &&
      previousNewsletter.status !== SendStatus.SCHEDULED &&
      newsletter.status === SendStatus.SCHEDULED &&
      newsletter.studentIds &&
      newsletter.studentIds.length > 0
    ) {
      try {
        await this._generateShortlinks(newsletter, event.manager);
      } catch (error) {
        this.logger.error(
          `Failed to process shortlinks for newsletter ${newsletter.id} after update:`,
          error,
        );
      }
    }
  }

  private async _generateShortlinks(
    newsletter: Newsletter,
    manager: EntityManager,
  ): Promise<void> {
    // 학생 정보 조회
    const students = await manager.find(Student, {
      where: { id: In(newsletter.studentIds || []) },
      relations: ['parent'],
    });
    const term = await manager.findOne(Term, {
      where: { id: newsletter.termId },
    });

    if (students.length === 0) {
      this.logger.warn(`No students found for newsletter ${newsletter.id}`);
      return;
    }

    if (term === null) {
      this.logger.warn(`No term found for newsletter ${newsletter.id}`);
      return;
    }

    // Shortlinks 생성
    await this._createShortlinks(
      manager,
      term,
      newsletter,
      students,
      newsletter.id,
    );
  }

  private async _createShortlinks(
    manager: EntityManager,
    term: Term,
    newsletter: Newsletter,
    students: Student[],
    newsletterId: number,
  ): Promise<Shortlink[]> {
    const dtos: CreateShortlinkDto[] = [];
    for (const student of students) {
      const data = {
        nanoId: nanoid(),
        type: newsletter.type,
        termId: newsletter.termId,
        studentId: student.id,
      };

      const payload = this._buildNotificationCoreData(
        data.nanoId,
        student,
        term,
        newsletter,
      );

      const dto = {
        parentId: student.parent.id,
        newsletterId: newsletterId,
        nanoid: data.nanoId,
        role: 'PARENT',
        routes: JSON.stringify(data),
        payload: payload,
      } as CreateShortlinkDto;

      dtos.push(dto);
    }

    const batches = chunk(dtos, 500);
    this.logger.debug(`Total DTOs: ${dtos.length}, Batches: ${batches.length}`);

    // Shortlinks 생성
    for (const batch of batches) {
      try {
        this.logger.debug(`Processing batch with ${batch.length} items`);
        for (const dto of batch) {
          await manager
            .createQueryBuilder()
            .insert()
            .into(Shortlink)
            .values(dto)
            .orUpdate(
              ['newsletterId', 'nanoid', 'role', 'routes', 'payload'],
              ['parentId', 'newsletterId'],
            )
            .execute();
        }
      } catch (error) {
        this.logger.error(`Failed to upsert Shortlinks: ${error.message}`);
        throw new Error('숏링크 생성에 실패했습니다.');
      }
    }

    // 생성된 shortlinks 조회하여 반환
    return await manager.find(Shortlink, {
      where: { newsletterId: newsletter.id },
      relations: { parent: true, newsletter: true },
    });
  }

  private _buildNotificationCoreData(
    nanoId: string,
    student: Student,
    term: Term,
    newsletter: Newsletter,
  ): NotificationCoreData {
    let body: string;

    switch (newsletter.type) {
      case NewsletterType.REGISTRATION:
        body = getTemplateOfRegistration({
          school: newsletter.schoolName,
          term: newsletter.termName,
          period: term.bookingPeriod,
          shortlink: `${this.domain}/${nanoId}`,
        });
        break;
      case NewsletterType.CHANGES:
        body = getTemplateOfNewsChanges({
          school: newsletter.schoolName,
          term: newsletter.termName,
          title: newsletter.title || '수업 변동사항',
          shortlink: `${this.domain}/${nanoId}`,
        });
        break;
      case NewsletterType.SCHEDULES:
        body = getTemplateOfNewsSchedules({
          school: newsletter.schoolName,
          term: newsletter.termName,
          title: newsletter.title || '수업 준비물',
          shortlink: `${this.domain}/${nanoId}`,
        });
        break;
      case NewsletterType.SUPPLIES:
        body = getTemplateOfNewsSupplies({
          school: newsletter.schoolName,
          term: newsletter.termName,
          title: newsletter.title || '수업 일정변경',
          shortlink: `${this.domain}/${nanoId}`,
        });
        break;
      default:
        body = '';
    }

    return {
      token: student.parent.user?.pushToken || null,
      phone: student.parent.phone,
      template: this._getTemplateName(newsletter.type),
      title: newsletter.title || this._getDefaultTitle(newsletter.type),
      body: body,
      role: 'PARENT',
      url: `${this.domain}/${nanoId}`,
      routes: {
        nanoId: nanoId,
        type: newsletter.type,
        termId: newsletter.termId.toString(),
        studentId: student.id.toString(),
      },
    };
  }

  private _getTemplateName(type: NewsletterType) {
    switch (type) {
      case NewsletterType.REGISTRATION:
        return 'Registration1';
      case NewsletterType.CHANGES:
        return 'NewsChange1';
      case NewsletterType.SCHEDULES:
        return 'NewsSchedule1';
      case NewsletterType.SUPPLIES:
        return 'NewsSupplies1';
      default:
        return 'Unknown';
    }
  }

  private _getDefaultTitle(type: NewsletterType) {
    switch (type) {
      case NewsletterType.REGISTRATION:
        return '수강신청안내';
      case NewsletterType.CHANGES:
        return '수업 변동사항';
      case NewsletterType.SCHEDULES:
        return '수업 준비물';
      case NewsletterType.SUPPLIES:
        return '수업 일정변경';
      default:
        return '새로운 공지사항';
    }
  }
}
