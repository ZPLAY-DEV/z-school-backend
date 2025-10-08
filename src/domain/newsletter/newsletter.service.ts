import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Paginated, PaginateQuery } from 'nestjs-paginate';
import { NewsletterType } from 'src/common/enums';
import { SendStatus } from 'src/common/enums/send-status';
import { CreateNewsletterDto } from 'src/domain/newsletter/dto/create-newsletter.dto';
import { ReadStatDto } from 'src/domain/newsletter/dto/read-stat.dto';
import { UpdateNewsletterDto } from 'src/domain/newsletter/dto/update-newsletter.dto';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { Notifiable } from 'src/domain/notifiable/entities/notifiable.entity';
import { Recipient } from 'src/domain/notifiable/entities/recipient.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { NotificationService } from 'src/services/notification/notification.service';
import { SlackService } from 'src/services/slack/slack.service';
import { DataSource, EntityManager, Repository } from 'typeorm';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);
  private readonly domain;
  constructor(
    @InjectRepository(Newsletter)
    private readonly newsletterRepository: Repository<Newsletter>,
    @InjectRepository(Notifiable)
    private readonly notifiableRepository: Repository<Notifiable>,
    @InjectRepository(Recipient)
    private readonly recipientRepository: Repository<Recipient>,
    @InjectRepository(Term)
    private readonly termRepository: Repository<Term>,
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
    private readonly dataSource: DataSource,
    private readonly slack: SlackService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
  ) {
    this.domain =
      this.configService.get('nodeEnv') === 'prod'
        ? 'https://스쿨허브.kr'
        : 'https://dev.스쿨허브.kr';
  }

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  async createNewsletter(dto: CreateNewsletterDto): Promise<Newsletter> {
    const school = await this._checkSchoolValidity(dto.schoolId);
    const term = await this._checkTermValidity(dto.termId);

    const title = dto.title || `[${school.name}] ${term.termName} 공지사항`;

    const newsletter = await this.newsletterRepository.save(
      this.newsletterRepository.create({
        schoolId: dto.schoolId,
        termId: dto.termId,
        schoolName: school.name,
        termName: term.termName,
        title: title,
        body: dto.body || null,
        images: dto.images || null,
        type: dto.type || NewsletterType.CHANGES,
      }),
    );

    return newsletter;
  }

  // TODO: Notifiable로 발송 로직 이관 필요

  async resendNewsletter(id: number): Promise<void> {
    const newsletter = await this.findById(id, ['notifiable']);

    if (!newsletter.notifiable) {
      throw new NotFoundException('Notifiable not found for newsletter');
    }

    if (newsletter.notifiable.status !== SendStatus.SENT) {
      throw new BadRequestException('발송 후 다시 시도하세요.');
    }

    // 읽지 않은 수신자 조회
    const unreadRecipients = await this.recipientRepository.find({
      where: {
        notifiableId: newsletter.notifiable.id,
        isRead: false,
      },
    });

    if (unreadRecipients.length === 0) {
      throw new UnprocessableEntityException('everyone has read');
    }

    // TODO: payload 재구성 및 재발송 로직 구현 필요
    this.logger.warn('⚠️ Resend logic needs to be reimplemented');
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  async findRegistrationNewsletter(
    schoolId: number,
    termId: number,
  ): Promise<Newsletter> {
    const newsletter = await this.newsletterRepository.findOne({
      where: { schoolId, termId },
    });

    if (!newsletter) {
      throw new NotFoundException('Newsletter not found');
    }

    return newsletter;
  }

  async findById(id: number, relations?: string[]): Promise<Newsletter> {
    const newsletter = await this.newsletterRepository.findOne({
      where: { id },
      relations: relations,
    });

    if (!newsletter) {
      throw new NotFoundException('Newsletter not found');
    }

    return newsletter;
  }

  async findReadStats(newsletterId: number): Promise<ReadStatDto[]> {
    const newsletter = await this.newsletterRepository.findOne({
      where: { id: newsletterId },
      relations: { notifiable: true },
    });

    if (!newsletter || !newsletter.notifiable) {
      throw new NotFoundException('Newsletter or Notifiable not found');
    }

    // Recipient를 통해 Student와 함께 조회
    const recipients = await this.recipientRepository.find({
      where: {
        notifiableId: newsletter.notifiable.id,
      },
      relations: ['student'],
    });

    // 결과를 ReadStatDto 형태로 변환
    return recipients.map((recipient) => ({
      id: recipient.student.id,
      name: recipient.student.name,
      grade: recipient.student.grade,
      class: recipient.student.class,
      studentCode: recipient.student.studentCode,
      link: recipient.nanoid ? `${this.domain}/${recipient.nanoid}` : null,
      read: recipient.isRead ?? false,
      createdAt: recipient.createdAt,
    }));
  }

  async findReadStatsPaginated(
    newsletterId: number,
    query: PaginateQuery,
  ): Promise<Paginated<ReadStatDto>> {
    // TODO: NotificationRecipient로 페이지네이션 재구현 필요
    this.logger.warn('⚠️ findReadStatsPaginated needs to be reimplemented');
    throw new UnprocessableEntityException('Not implemented yet');
  }

  // TODO: Notifiable에서 pending items 조회하도록 이관 필요

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateNewsletterDto): Promise<Newsletter> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const newsletter = await this.newsletterRepository.preload({
        id,
        ...dto,
      });
      if (!newsletter) {
        throw new NotFoundException('Newsletter not found');
      }
      return await manager.save(newsletter);
    });
  }

  async markAsRead(newsletterId: number, parentId: number): Promise<void> {
    // Newsletter의 Notifiable 조회
    const newsletter = await this.newsletterRepository.findOne({
      where: { id: newsletterId },
      relations: ['notifiable'],
    });

    if (!newsletter?.notifiable) {
      this.logger.warn(`⚠️ No notifiable found for newsletter ${newsletterId}`);
      return;
    }

    // Recipient 업데이트 (Parent의 모든 자녀에 대한 recipient 업데이트)
    // 1. Parent의 자녀들 조회
    const students = await this.dataSource.getRepository(Student).find({
      where: { parentId },
      select: ['id'],
    });
    const studentIds = students.map((s) => s.id);

    if (studentIds.length === 0) {
      this.logger.warn(`⚠️ No students found for parent ${parentId}`);
      return;
    }

    // 2. Recipient 업데이트
    const result = await this.recipientRepository
      .createQueryBuilder()
      .update(Recipient)
      .set({ isRead: true, readAt: new Date() })
      .where('notifiableId = :notifiableId AND studentId IN (:...studentIds)', {
        notifiableId: newsletter.notifiable.id,
        studentIds,
      })
      .execute();

    if (result.affected === 0) {
      this.logger.warn(
        `⚠️ No recipient found for newsletter ${newsletterId}, parent ${parentId}`,
      );
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  async delete(id: number): Promise<Newsletter> {
    const newsletter = await this.findById(id, ['notifiable']);

    // Recipient 삭제 (cascade로 자동 삭제될 수도 있음)
    if (newsletter.notifiable) {
      await this.recipientRepository.delete({
        notifiableId: newsletter.notifiable.id,
      });
      await this.notifiableRepository.softRemove(newsletter.notifiable);
    }

    return await this.newsletterRepository.softRemove(newsletter);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Private Methods
  //? ---------------------------------------------------------------------- ?//

  private async _checkSchoolValidity(schoolId: number): Promise<School> {
    const school = await this.schoolRepository.findOne({
      where: { id: schoolId },
    });
    if (!school) {
      throw new NotFoundException('⚠️ School not found');
    }
    return school;
  }

  private async _checkTermValidity(termId: number): Promise<Term> {
    const term = await this.termRepository.findOne({ where: { id: termId } });
    if (!term) {
      throw new NotFoundException('⚠️ Term not found');
    }
    return term;
  }

  // TODO: Helper methods 재구현 필요
}
