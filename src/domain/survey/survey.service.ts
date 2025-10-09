import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Notifiable } from 'src/domain/notifiable/entities/notifiable.entity';
import { Recipient } from 'src/domain/notifiable/entities/recipient.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { CreateSurveyDto } from 'src/domain/survey/dto/create-survey.dto';
import { UpdateSurveyDto } from 'src/domain/survey/dto/update-survey.dto';
import { Survey } from 'src/domain/survey/entities/survey.entity';
import { SlackService } from 'src/services/slack/slack.service';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class SurveyService {
  private readonly logger = new Logger(SurveyService.name);

  constructor(
    @InjectRepository(Survey)
    private readonly surveyRepository: Repository<Survey>,
    @InjectRepository(Notifiable)
    private readonly notifiableRepository: Repository<Notifiable>,
    @InjectRepository(Recipient)
    private readonly recipientRepository: Repository<Recipient>,
    private readonly dataSource: DataSource,
    private readonly slack: SlackService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateSurveyDto): Promise<Survey> {
    try {
      const item = this.surveyRepository.create(dto);
      return await this.surveyRepository.save(item);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async findById(id: number, relations?: string[]): Promise<Survey> {
    const survey = await this.surveyRepository.findOne({
      where: { id },
      relations,
    });
    if (!survey) {
      throw new NotFoundException(`Survey not found`);
    }
    return survey;
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateSurveyDto) {
    const survey = await this.surveyRepository.preload({
      id,
      ...dto,
    });
    if (!survey) {
      throw new NotFoundException(`Survey not found`);
    }
    return await this.surveyRepository.save(survey);
  }

  async markAsRead(surveyId: number, parentId: number): Promise<void> {
    // Survey의 Notifiable 조회
    const survey = await this.surveyRepository.findOne({
      where: { id: surveyId },
      relations: ['notifiable'],
    });

    if (!survey?.notifiable) {
      this.logger.warn(`⚠️ No notifiable found for survey ${surveyId}`);
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
        notifiableId: survey.notifiable.id,
        studentIds,
      })
      .execute();

    if (result.affected === 0) {
      this.logger.warn(
        `⚠️ No recipient found for survey ${surveyId}, parent ${parentId}`,
      );
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  async delete(id: number): Promise<Survey> {
    const survey = await this.findById(id, ['notifiable']);

    // Recipient 삭제 (cascade로 자동 삭제될 수도 있음)
    if (survey.notifiable) {
      await this.recipientRepository.delete({
        notifiableId: survey.notifiable.id,
      });
      await this.notifiableRepository.softRemove(survey.notifiable);
    }

    return await this.surveyRepository.softRemove(survey);
  }
}
