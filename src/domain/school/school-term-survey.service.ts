import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { paginate, PaginateQuery } from 'nestjs-paginate';
import { Survey } from 'src/domain/survey/entities/survey.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SchoolTermSurveyService {
  private readonly logger = new Logger(SchoolTermSurveyService.name);

  constructor(
    @InjectRepository(Survey)
    private readonly surveyRepository: Repository<Survey>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async list(schoolId: number, termId?: number): Promise<Survey[]> {
    const whereCondition: any = { schoolId };

    if (termId !== undefined) {
      whereCondition.termId = termId;
    }

    return await this.surveyRepository.find({
      where: whereCondition,
      order: { id: 'DESC' },
    });
  }

  async infiniteList(schoolId: number, query: PaginateQuery, termId?: number) {
    const queryBuilder = this.surveyRepository
      .createQueryBuilder('survey')
      .where('survey.schoolId = :schoolId', { schoolId });

    if (termId !== undefined) {
      queryBuilder.andWhere('survey.termId = :termId', { termId });
    }

    return await paginate<Survey>(query, queryBuilder, {
      relations: ['surveyQuestions', 'surveyAnswers', 'notifiable'],
      sortableColumns: ['id', 'createdAt', 'start', 'end'],
      searchableColumns: ['title', 'intro', 'outro'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {},
    });
  }
}
