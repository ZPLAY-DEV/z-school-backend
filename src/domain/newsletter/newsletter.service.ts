import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  NewsletterType,
  NotifiableSourceType,
  SendStatus,
} from 'src/common/enums';
import { CreateNewsletterDto } from 'src/domain/newsletter/dto/create-newsletter.dto';
import { UpdateNewsletterDto } from 'src/domain/newsletter/dto/update-newsletter.dto';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { UpdateNotifiableDto } from 'src/domain/notifiable/dto/update-notifiable.dto';
import { Notifiable } from 'src/domain/notifiable/entities/notifiable.entity';
import { Recipient } from 'src/domain/notifiable/entities/recipient.entity';
import { NotifiableService } from 'src/domain/notifiable/notifiable.service';
import { Student } from 'src/domain/student/entities/student.entity';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);
  constructor(
    @InjectRepository(Newsletter)
    private readonly newsletterRepository: Repository<Newsletter>,
    @InjectRepository(Notifiable)
    private readonly notifiableRepository: Repository<Notifiable>,
    @InjectRepository(Recipient)
    private readonly recipientRepository: Repository<Recipient>,
    private readonly dataSource: DataSource,
    private readonly notifiableService: NotifiableService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  async createNewsletter(dto: CreateNewsletterDto): Promise<Newsletter> {
    const newsletterType = dto.type || NewsletterType.CHANGES;

    let notifiable: Notifiable | null = null;
    try {
      if (dto.send) {
        notifiable = await this.notifiableService.save({
          schoolId: dto.schoolId,
          termId: dto.termId,
          type: NotifiableSourceType.NEWSLETTER,
          title: dto.title || `공지사항`,
          status: SendStatus.INIT,
          target: dto.send.target,
          targetItems: dto.send.targetItems,
          targetLabel: dto.send.targetLabel,
          scheduledAt: dto.send.scheduledAt,
        });
      }

      // Newsletter 생성
      const newsletter = await this.newsletterRepository.save(
        this.newsletterRepository.create({
          schoolId: dto.schoolId,
          termId: dto.termId,
          notifiableId: notifiable?.id || null,
          title: dto.title || `공지사항`,
          body: dto.body || null,
          images: dto.images || null,
          type: newsletterType,
        }),
      );

      //! 발송 예약 (send 정보의 scheduledAt가 있는 경우)
      if (dto.send && dto.send.scheduledAt && notifiable) {
        await this.notifiableService.send(notifiable.id);
      }

      return newsletter;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

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
    // send 키가 있는 경우, notifiable 업데이트 로직 처리
    if (dto.send) {
      const existingNewsletter = await this.newsletterRepository.findOne({
        where: { id },
        relations: ['notifiable'],
      });

      if (!existingNewsletter) {
        throw new NotFoundException('Newsletter not found');
      }

      if (existingNewsletter.notifiable) {
        const { status } = existingNewsletter.notifiable;

        // SENT 상태인 경우 오류 발생
        if (status === SendStatus.SENT) {
          throw new BadRequestException('변경 가능한 상태가 아닙니다.');
        }

        const updateData: UpdateNotifiableDto = {
          ...(dto.title !== existingNewsletter.title && { title: dto.title }),
          ...(dto.send?.target !== existingNewsletter.notifiable.target && {
            target: dto.send.target,
          }),
          ...(dto.send?.targetItems !==
            existingNewsletter.notifiable.targetItems && {
            targetItems: dto.send.targetItems,
          }),
          ...(dto.send?.targetLabel !==
            existingNewsletter.notifiable.targetLabel && {
            targetLabel: dto.send.targetLabel,
          }),
          ...(dto.send?.scheduledAt !==
            existingNewsletter.notifiable.scheduledAt && {
            scheduledAt: dto.send.scheduledAt,
          }),
          message: 'updated',
        };

        await this.notifiableRepository.update(
          existingNewsletter.notifiable.id,
          updateData,
        );

        //! 발송 예약 (target 또는 targetItems가 변경된 경우)
        if (
          dto.send &&
          dto.send.scheduledAt &&
          (dto.send.target !== existingNewsletter.notifiable.target ||
            dto.send.targetItems !== existingNewsletter.notifiable.targetItems)
        ) {
          // 모든 현재 연관 recipient를 삭제
          await this.recipientRepository.delete({
            notifiableId: existingNewsletter.notifiable.id,
          });

          await this.notifiableService.send(existingNewsletter.notifiable.id);
        }
      }
    }

    // Newsletter 업데이트
    const newsletter = await this.newsletterRepository.preload({
      id,
      ...dto,
    });
    if (!newsletter) {
      throw new NotFoundException('Newsletter not found');
    }
    return await this.newsletterRepository.save(newsletter);
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
}
