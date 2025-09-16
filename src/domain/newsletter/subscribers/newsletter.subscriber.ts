import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { nanoid } from 'nanoid';
import { NewsletterType } from 'src/common/enums';
import { Student } from 'src/domain/student/entities/student.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { chunk } from 'src/helpers/array';
import {
  getTemplateOfNewsChanges,
  getTemplateOfNewsSchedules,
  getTemplateOfNewsSupplies,
  getTemplateOfRegistration,
} from 'src/helpers/get-message-body';
import { getMobileRoute } from 'src/helpers/uri';
import {
  DataSource,
  EntityManager,
  EntitySubscriberInterface,
  In,
  InsertEvent,
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
    if (
      newsletter.studentIds &&
      newsletter.studentIds.length > 0 &&
    ) {
      this.logger.log(
        `Processing shortlinks for dispatch ${dispatch.id} with ${dispatch.studentIds.length} students`,
      );

      try {
        await this._processShortlinks(newsletter, event.manager);
        this.logger.log(
          `Successfully processed shortlinks for dispatch ${dispatch.id}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process shortlinks for dispatch ${dispatch.id}:`,
          error,
        );
      }
    }
  }

  private async _processShortlinks(
    dispatch: Dispatch,
    manager: EntityManager,
  ): Promise<void> {
    // Newsletter와 Term 정보 조회
    const newsletter = await manager.findOne(Newsletter, {
      where: { id: dispatch.newsletterId },
      relations: ['term'],
    });

    if (!newsletter) {
      throw new Error(`Newsletter not found: ${dispatch.newsletterId}`);
    }

    // 학생 정보 조회
    const students = await manager.find(Student, {
      where: { id: In(dispatch.studentIds || []) },
      relations: ['parent'],
    });

    if (students.length === 0) {
      this.logger.warn(`No students found for dispatch ${dispatch.id}`);
      return;
    }

    // Shortlinks 생성
    const shortlinks = await this._createShortlinks(
      manager,
      newsletter,
      students,
      dispatch.id,
    );

    // Payload 생성 및 업데이트
    const payload = this._buildNotificationFullData(
      newsletter.term,
      newsletter,
      shortlinks,
      students,
    );

    await manager.update(Dispatch, dispatch.id, { payload: payload as any });
  }

  private async _createShortlinks(
    manager: EntityManager,
    newsletter: Newsletter,
    students: Student[],
    dispatchId: number,
  ): Promise<Shortlink[]> {
    const dtos: any[] = [];

    for (const student of students) {
      const randomId = nanoid();
      const routes = JSON.stringify({
        type:
          newsletter.type === NewsletterType.REGISTRATION
            ? 'REGISTRATION'
            : 'NOTIFICATION',
        termId: newsletter.termId,
        studentId: student.id,
      });
      const dto = {
        parentId: student.parent.id,
        newsletterId: newsletter.id,
        dispatchId: dispatchId,
        nanoid: randomId,
        role: 'PARENT',
        url: getMobileRoute(
          newsletter.type,
          newsletter.termId,
          randomId,
          student.id,
        ),
        routes: routes,
      };
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
            .values({
              parentId: dto.parentId,
              newsletterId: dto.newsletterId,
              dispatchId: dto.dispatchId,
              nanoid: dto.nanoid,
              role: dto.role,
              url: dto.url,
              routes: dto.routes || '{}',
            })
            .orUpdate(
              ['dispatchId', 'nanoid', 'role', 'url', 'routes'],
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

  private _buildNotificationFullData(
    term: Term,
    newsletter: Newsletter,
    shortlinks: Shortlink[],
    students: Student[],
  ) {
    let body: string;
    const messages = students.map((student: Student) => {
      const shortlink = shortlinks.find(
        (shortlink) => shortlink.parentId === student.parent.id,
      );

      switch (newsletter.type) {
        case NewsletterType.REGISTRATION:
          body = getTemplateOfRegistration({
            school: newsletter.schoolName,
            term: newsletter.termName,
            period: term.bookingPeriod,
            shortlink: `${this.domain}/${shortlink?.nanoid}`,
          });
          break;
        case NewsletterType.CHANGES:
          body = getTemplateOfNewsChanges({
            school: newsletter.schoolName,
            term: newsletter.termName,
            title: newsletter.title || '수업 변동사항',
            shortlink: `${this.domain}/${shortlink?.nanoid}`,
          });
          break;
        case NewsletterType.SCHEDULES:
          body = getTemplateOfNewsSchedules({
            school: newsletter.schoolName,
            term: newsletter.termName,
            title: newsletter.title || '수업 준비물',
            shortlink: `${this.domain}/${shortlink?.nanoid}`,
          });
          break;
        case NewsletterType.SUPPLIES:
          body = getTemplateOfNewsSupplies({
            school: newsletter.schoolName,
            term: newsletter.termName,
            title: newsletter.title || '수업 일정변경',
            shortlink: `${this.domain}/${shortlink?.nanoid}`,
          });
          break;
        default:
          body = '';
      }

      return {
        token: student.parent.user?.pushToken || null,
        phone: student.parent.phone,
        title: newsletter.title,
        body: body,
        data: {
          type: newsletter.type,
          termId: newsletter.termId.toString(),
          studentId: student.id.toString(),
          shortlinkId: shortlink?.nanoid || '',
          url: shortlink?.url
            ? `${this.domain}/${shortlink?.nanoid}`
            : undefined,
        },
      };
    });

    return {
      type: newsletter.type,
      schoolId: newsletter.schoolId,
      messages: messages,
    };
  }
}
