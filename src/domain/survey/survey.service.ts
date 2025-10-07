import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateSurveyDto } from 'src/domain/survey/dto/create-survey.dto';
import { UpdateSurveyDto } from 'src/domain/survey/dto/update-survey.dto';
import { Survey } from 'src/domain/survey/entities/survey.entity';
import { SlackService } from 'src/services/slack/slack.service';
import { Repository } from 'typeorm/repository/Repository';

@Injectable()
export class SurveyService {
  private readonly logger = new Logger(SurveyService.name);

  constructor(
    @InjectRepository(Survey)
    private readonly surveyRepository: Repository<Survey>,
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
    const order = await this.surveyRepository.preload({
      id,
      ...dto,
    });
    if (!order) {
      throw new NotFoundException(`Survey not found`);
    }
    return await this.surveyRepository.save(order);
  }
}
