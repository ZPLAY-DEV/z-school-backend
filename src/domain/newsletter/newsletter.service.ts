import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { NewsletterType, NotifiableSourceType } from 'src/common/enums';
import { CreateNewsletterDto } from 'src/domain/newsletter/dto/create-newsletter.dto';
import { UpdateNewsletterDto } from 'src/domain/newsletter/dto/update-newsletter.dto';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { Notifiable } from 'src/domain/notifiable/entities/notifiable.entity';
import { Recipient } from 'src/domain/notifiable/entities/recipient.entity';
import { NotifiableService } from 'src/domain/notifiable/notifiable.service';
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
    private readonly notifiableService: NotifiableService,
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
    const newsletterType = dto.type || NewsletterType.CHANGES;

    // Notifiable 생성 (send 정보가 있는 경우)
    let notifiable: Notifiable | null = null;
    if (dto.send) {
      notifiable = await this.notifiableRepository.save(
        this.notifiableRepository.create({
          schoolId: dto.schoolId,
          termId: dto.termId,
          type: NotifiableSourceType.NEWSLETTER,
          title: title,
          message: dto.body || '공지사항을 확인해주세요.',
        }),
      );
    }

    // Newsletter 생성
    const newsletter = await this.newsletterRepository.save(
      this.newsletterRepository.create({
        schoolId: dto.schoolId,
        termId: dto.termId,
        notifiableId: notifiable?.id || null,
        schoolName: school.name,
        termName: term.termName,
        title: title,
        body: dto.body || null,
        images: dto.images || null,
        type: newsletterType,
      }),
    );

    // 발송 예약 (send 정보가 있는 경우)
    if (dto.send && notifiable) {
      await this.notifiableService.send({
        notifiableId: notifiable.id,
        target: dto.send.target,
        targetItems: dto.send.targetItems,
        targetLabel: dto.send.targetLabel,
        scheduledAt: dto.send.scheduledAt,
      });
    }

    return newsletter;
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

  /**
   * Parent의 모든 자녀 recipients를 읽음 처리 (다자녀 가정 편의성)
   */
  async markAsReadByParent(
    newsletterId: number,
    parentId: number,
  ): Promise<void> {
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
      .set({ readAt: new Date() })
      .where('notifiableId = :notifiableId AND studentId IN (:...studentIds)', {
        notifiableId: newsletter.notifiable.id,
        studentIds,
      })
      .execute();

    this.logger.log(
      `✅ Newsletter ${newsletterId} marked as read for ${result.affected} recipients (parent ${parentId})`,
    );
  }

  /**
   * 특정 Student의 recipient만 읽음 처리 (정확성)
   */
  async markAsReadByStudent(
    newsletterId: number,
    studentId: number,
  ): Promise<void> {
    // Newsletter의 Notifiable 조회
    const newsletter = await this.newsletterRepository.findOne({
      where: { id: newsletterId },
      relations: ['notifiable'],
    });

    if (!newsletter?.notifiable) {
      this.logger.warn(`⚠️ No notifiable found for newsletter ${newsletterId}`);
      return;
    }

    // Recipient 업데이트 (특정 학생의 recipient만)
    const result = await this.recipientRepository
      .createQueryBuilder()
      .update(Recipient)
      .set({ readAt: new Date() })
      .where('notifiableId = :notifiableId AND studentId = :studentId', {
        notifiableId: newsletter.notifiable.id,
        studentId,
      })
      .execute();

    if (result.affected === 0) {
      this.logger.warn(
        `⚠️ No recipient found for newsletter ${newsletterId}, student ${studentId}`,
      );
      return;
    }

    this.logger.log(
      `✅ Newsletter ${newsletterId} marked as read for student ${studentId}`,
    );
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
