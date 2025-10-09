import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { NotifiableSourceType } from 'src/common/enums';
import { Notifiable } from 'src/domain/notifiable/entities/notifiable.entity';
import { Recipient } from 'src/domain/notifiable/entities/recipient.entity';
import { NotifiableService } from 'src/domain/notifiable/notifiable.service';
import { CreateReminderDto } from 'src/domain/reminder/dto/create-reminder.dto';
import { UpdateReminderDto } from 'src/domain/reminder/dto/update-reminder.dto';
import { Reminder } from 'src/domain/reminder/entities/reminder.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { NotificationService } from 'src/services/notification/notification.service';
import { SlackService } from 'src/services/slack/slack.service';
import { DataSource, EntityManager, Repository } from 'typeorm';

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);
  private readonly domain;

  constructor(
    @InjectRepository(Reminder)
    private readonly reminderRepository: Repository<Reminder>,
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

  async createReminder(dto: CreateReminderDto): Promise<Reminder> {
    const school = await this._checkSchoolValidity(dto.schoolId);
    const term = await this._checkTermValidity(dto.termId);

    // 학기당 1개만 생성 가능 체크
    const existing = await this.reminderRepository.findOne({
      where: { schoolId: dto.schoolId, termId: dto.termId },
    });

    if (existing) {
      throw new BadRequestException(
        '이미 해당 학기에 수강신청 안내가 존재합니다.',
      );
    }

    const title =
      dto.title || `[${school.name}] ${term.termName} 수강신청 안내`;

    // Notifiable 생성 (send 정보가 있는 경우)
    let notifiable: Notifiable | null = null;
    if (dto.send) {
      notifiable = await this.notifiableRepository.save(
        this.notifiableRepository.create({
          schoolId: dto.schoolId,
          termId: dto.termId,
          sourceType: NotifiableSourceType.REMINDER,
          title: title,
          message: dto.body || '수강신청 안내를 확인해주세요.',
        }),
      );
    }

    // Reminder 생성
    const reminder = await this.reminderRepository.save(
      this.reminderRepository.create({
        schoolId: dto.schoolId,
        termId: dto.termId,
        notifiableId: notifiable?.id || null,
        schoolName: school.name,
        termName: term.termName,
        title: title,
        body: dto.body || null,
        images: dto.images || null,
      }),
    );

    // 발송 예약 (send 정보가 있는 경우)
    if (dto.send && notifiable) {
      await this.notifiableService.send({
        notifiableId: notifiable.id,
        target: dto.send.target,
        targetItems: undefined, // Reminder는 항상 전교생 대상
        targetLabel: '전교생',
        scheduledAt: dto.send.scheduledAt,
      });
    }

    return reminder;
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  async findBySchoolAndTerm(
    schoolId: number,
    termId: number,
  ): Promise<Reminder> {
    const reminder = await this.reminderRepository.findOne({
      where: { schoolId, termId },
    });

    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    return reminder;
  }

  async findById(id: number, relations?: string[]): Promise<Reminder> {
    const reminder = await this.reminderRepository.findOne({
      where: { id },
      relations: relations,
    });

    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    return reminder;
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateReminderDto): Promise<Reminder> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const reminder = await this.reminderRepository.preload({
        id,
        ...dto,
      });
      if (!reminder) {
        throw new NotFoundException('Reminder not found');
      }
      return await manager.save(reminder);
    });
  }

  /**
   * Parent의 모든 자녀 recipients를 읽음 처리 (다자녀 가정 편의성)
   */
  async markAsReadByParent(
    reminderId: number,
    parentId: number,
  ): Promise<void> {
    // Reminder의 Notifiable 조회
    const reminder = await this.reminderRepository.findOne({
      where: { id: reminderId },
      relations: ['notifiable'],
    });

    if (!reminder?.notifiable) {
      this.logger.warn(`⚠️ No notifiable found for reminder ${reminderId}`);
      return;
    }

    // Recipient 업데이트 (Parent의 모든 자녀에 대한 recipient 업데이트)
    const students = await this.dataSource.getRepository(Student).find({
      where: { parentId },
      select: ['id'],
    });
    const studentIds = students.map((s) => s.id);

    if (studentIds.length === 0) {
      this.logger.warn(`⚠️ No students found for parent ${parentId}`);
      return;
    }

    const result = await this.recipientRepository
      .createQueryBuilder()
      .update(Recipient)
      .set({ readAt: new Date() })
      .where('notifiableId = :notifiableId AND studentId IN (:...studentIds)', {
        notifiableId: reminder.notifiable.id,
        studentIds,
      })
      .execute();

    if (result.affected === 0) {
      this.logger.warn(
        `⚠️ No recipient found for reminder ${reminderId}, parent ${parentId}`,
      );
      return;
    }

    this.logger.log(
      `✅ Reminder ${reminderId} marked as read for ${result.affected} recipients (parent ${parentId})`,
    );
  }

  /**
   * 특정 Student의 recipient만 읽음 처리 (정확성)
   */
  async markAsReadByStudent(
    reminderId: number,
    studentId: number,
  ): Promise<void> {
    // Reminder의 Notifiable 조회
    const reminder = await this.reminderRepository.findOne({
      where: { id: reminderId },
      relations: ['notifiable'],
    });

    if (!reminder?.notifiable) {
      this.logger.warn(`⚠️ No notifiable found for reminder ${reminderId}`);
      return;
    }

    // Recipient 업데이트 (특정 학생의 recipient만)
    const result = await this.recipientRepository
      .createQueryBuilder()
      .update(Recipient)
      .set({ readAt: new Date() })
      .where('notifiableId = :notifiableId AND studentId = :studentId', {
        notifiableId: reminder.notifiable.id,
        studentId,
      })
      .execute();

    if (result.affected === 0) {
      this.logger.warn(
        `⚠️ No recipient found for reminder ${reminderId}, student ${studentId}`,
      );
      return;
    }

    this.logger.log(
      `✅ Reminder ${reminderId} marked as read for student ${studentId}`,
    );
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  async delete(id: number): Promise<Reminder> {
    const reminder = await this.findById(id, ['notifiable']);

    // Recipient 삭제 (cascade로 자동 삭제될 수도 있음)
    if (reminder.notifiable) {
      await this.recipientRepository.delete({
        notifiableId: reminder.notifiable.id,
      });
      await this.notifiableRepository.softRemove(reminder.notifiable);
    }

    return await this.reminderRepository.softRemove(reminder);
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
}
