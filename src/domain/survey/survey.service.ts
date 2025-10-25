import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NotifiableSourceType, SendStatus } from 'src/common/enums';
import { UpdateNotifiableDto } from 'src/domain/notifiable/dto/update-notifiable.dto';
import { Notifiable } from 'src/domain/notifiable/entities/notifiable.entity';
import { Recipient } from 'src/domain/notifiable/entities/recipient.entity';
import { NotifiableService } from 'src/domain/notifiable/notifiable.service';
import { Student } from 'src/domain/student/entities/student.entity';
import { CreateSurveyDto } from 'src/domain/survey/dto/create-survey.dto';
import { UpdateSurveyDto } from 'src/domain/survey/dto/update-survey.dto';
import { Survey } from 'src/domain/survey/entities/survey.entity';
import { SurveyQuestion } from 'src/domain/survey/entities/survey_question.entity';
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
    @InjectRepository(SurveyQuestion)
    private readonly surveyQuestionRepository: Repository<SurveyQuestion>,
    private readonly dataSource: DataSource,
    private readonly notifiableService: NotifiableService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateSurveyDto): Promise<Survey> {
    let notifiable: Notifiable | null = null;
    try {
      if (dto.send) {
        notifiable = await this.notifiableService.save({
          schoolId: dto.schoolId,
          termId: dto.termId,
          type: NotifiableSourceType.SURVEY,
          title: dto.title || '만족도 조사',
          status: SendStatus.INIT,
          target: dto.send.target,
          targetItems: dto.send.targetItems,
          targetLabel: dto.send.targetLabel,
          scheduledAt: dto.send.scheduledAt,
        });
      }

      // Survey 생성
      const survey = await this.surveyRepository.save(
        this.surveyRepository.create({
          schoolId: dto.schoolId,
          termId: dto.termId,
          notifiableId: notifiable?.id || null,
          title: dto.title,
          intro: dto.intro,
          outro: dto.outro,
          start: dto.start,
          end: dto.end,
        }),
      );

      // SurveyQuestion upsert (id가 있으면 업데이트, 없으면 생성)
      if (dto.surveyQuestions && dto.surveyQuestions.length > 0) {
        const questions = await Promise.all(
          dto.surveyQuestions.map(async (q) => {
            if (q.id) {
              // id가 있으면 기존 레코드 업데이트
              const existing = await this.surveyQuestionRepository.preload({
                id: q.id,
                ...q,
                surveyId: survey.id,
              });
              return (
                existing ||
                this.surveyQuestionRepository.create({
                  ...q,
                  surveyId: survey.id,
                })
              );
            } else {
              // id가 없으면 새로 생성
              return this.surveyQuestionRepository.create({
                ...q,
                surveyId: survey.id,
              });
            }
          }),
        );
        await this.surveyQuestionRepository.save(questions);
      }

      // 발송 예약 (send 정보가 있는 경우)
      if (dto.send && dto.send.scheduledAt && notifiable) {
        await this.notifiableService.send(notifiable.id);
      }

      return survey;
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
    // send 키가 있는 경우, notifiable 업데이트 로직 처리
    if (dto.send) {
      const existingSurvey = await this.surveyRepository.findOne({
        where: { id },
        relations: ['notifiable'],
      });

      if (!existingSurvey) {
        throw new NotFoundException(`Survey not found`);
      }

      if (existingSurvey.notifiable) {
        const { status } = existingSurvey.notifiable;

        // SENT 상태인 경우 오류 발생
        if (status === SendStatus.SENT) {
          throw new BadRequestException('변경 가능한 상태가 아닙니다.');
        }

        const updateData: UpdateNotifiableDto = {
          ...(dto.title !== existingSurvey.title && { title: dto.title }),
          ...(dto.send?.target !== existingSurvey.notifiable.target && {
            target: dto.send.target,
          }),
          ...(dto.send?.targetItems !==
            existingSurvey.notifiable.targetItems && {
            targetItems: dto.send.targetItems,
          }),
          ...(dto.send?.targetLabel !==
            existingSurvey.notifiable.targetLabel && {
            targetLabel: dto.send.targetLabel,
          }),
          ...(dto.send?.scheduledAt !==
            existingSurvey.notifiable.scheduledAt && {
            scheduledAt: dto.send.scheduledAt,
          }),
          message: 'updated',
        };

        await this.notifiableRepository.update(
          existingSurvey.notifiable.id,
          updateData,
        );

        //! 발송 예약 (target 또는 targetItems가 변경된 경우)
        if (
          dto.send &&
          dto.send.scheduledAt &&
          (dto.send.target !== existingSurvey.notifiable.target ||
            dto.send.targetItems !== existingSurvey.notifiable.targetItems)
        ) {
          // 모든 현재 연관 recipient를 삭제
          await this.recipientRepository.delete({
            notifiableId: existingSurvey.notifiable.id,
          });

          await this.notifiableService.send(existingSurvey.notifiable.id);
        }
      }
    }

    // SurveyQuestion upsert (dto에 surveyQuestions가 있는 경우)
    if (dto.surveyQuestions && dto.surveyQuestions.length > 0) {
      const questions = await Promise.all(
        dto.surveyQuestions.map(async (q) => {
          if (q.id) {
            // id가 있으면 기존 레코드 업데이트
            const existing = await this.surveyQuestionRepository.preload({
              id: q.id,
              ...q,
              surveyId: id,
            });
            return (
              existing ||
              this.surveyQuestionRepository.create({
                ...q,
                surveyId: id,
              })
            );
          } else {
            // id가 없으면 새로 생성
            return this.surveyQuestionRepository.create({
              ...q,
              surveyId: id,
            });
          }
        }),
      );
      await this.surveyQuestionRepository.save(questions);
    }

    // Survey 업데이트
    const survey = await this.surveyRepository.preload({
      id,
      ...dto,
    });
    if (!survey) {
      throw new NotFoundException(`Survey not found`);
    }
    return await this.surveyRepository.save(survey);
  }

  /**
   * Parent의 모든 자녀 recipients를 읽음 처리 (다자녀 가정 편의성)
   */
  async markAsReadByParent(surveyId: number, parentId: number): Promise<void> {
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
      return;
    }

    this.logger.log(
      `✅ Survey ${surveyId} marked as read for ${result.affected} recipients (parent ${parentId})`,
    );
  }

  /**
   * 특정 Student의 recipient만 읽음 처리 (정확성)
   */
  async markAsReadByStudent(
    surveyId: number,
    studentId: number,
  ): Promise<void> {
    // Survey의 Notifiable 조회
    const survey = await this.surveyRepository.findOne({
      where: { id: surveyId },
      relations: ['notifiable'],
    });

    if (!survey?.notifiable) {
      this.logger.warn(`⚠️ No notifiable found for survey ${surveyId}`);
      return;
    }

    // Recipient 업데이트 (특정 학생의 recipient만)
    const result = await this.recipientRepository
      .createQueryBuilder()
      .update(Recipient)
      .set({ readAt: new Date() })
      .where('notifiableId = :notifiableId AND studentId = :studentId', {
        notifiableId: survey.notifiable.id,
        studentId,
      })
      .execute();

    if (result.affected === 0) {
      this.logger.warn(
        `⚠️ No recipient found for survey ${surveyId}, student ${studentId}`,
      );
      return;
    }

    this.logger.log(
      `✅ Survey ${surveyId} marked as read for student ${studentId}`,
    );
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
