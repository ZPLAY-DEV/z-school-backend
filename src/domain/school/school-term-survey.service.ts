import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FilterOperator, paginate, PaginateQuery } from 'nestjs-paginate';
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
  //? Create
  //? ---------------------------------------------------------------------- ?//

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async getSurveyBySchoolAndTerm(
    schoolId: number,
    termId: number,
  ): Promise<Survey | null> {
    return await this.surveyRepository.findOne({
      where: {
        schoolId,
        termId,
      },
      relations: [
        'school',
        'term',
        'surveyTargets',
        'surveyQuestions',
        'surveyAnswers',
      ],
    });
  }

  async list(schoolId: number, termId?: number): Promise<Survey[]> {
    const whereCondition: any = { schoolId };

    if (termId !== undefined) {
      whereCondition.termId = termId;
    }

    return await this.surveyRepository.find({
      where: whereCondition,
      order: { id: 'DESC' },
      relations: ['school', 'term'],
    });
  }

  async infiniteList(schoolId: number, query: PaginateQuery, termId?: number) {
    const queryBuilder = this.surveyRepository
      .createQueryBuilder('survey')
      .where('survey.schoolId = :schoolId', { schoolId })
      .leftJoinAndSelect('survey.school', 'school')
      .leftJoinAndSelect('survey.term', 'term');

    if (termId !== undefined) {
      queryBuilder.andWhere('survey.termId = :termId', { termId });
    }

    return await paginate<Survey>(query, queryBuilder, {
      sortableColumns: ['id', 'title', 'start', 'end'],
      searchableColumns: ['title', 'intro', 'outro'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        termId: [FilterOperator.EQ, FilterOperator.IN],
        schoolId: [FilterOperator.EQ, FilterOperator.IN],
      },
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//
}
