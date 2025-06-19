import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FilterOperator, paginate, PaginateQuery } from 'nestjs-paginate';
import { DataSource, Repository } from 'typeorm';
import { Letter } from '../letter/entities/letter.entity';

@Injectable()
export class SchoolLetterService {
  private readonly logger = new Logger(SchoolLetterService.name);

  constructor(
    @InjectRepository(Letter)
    private readonly dispatchRepository: Repository<Letter>,
    private dataSource: DataSource,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async infiniteList(schoolId: number, termId: number, query: PaginateQuery) {
    const queryBuilder = this.dispatchRepository
      .createQueryBuilder('dispatch')
      .where('dispatch.schoolId = :schoolId', { schoolId })
      .andWhere('dispatch.termId = :termId', { termId });
    return await paginate<Letter>(query, queryBuilder, {
      sortableColumns: ['id'],
      searchableColumns: ['title', 'body'],
      defaultSortBy: [['id', 'ASC']],
      filterableColumns: {
        type: [FilterOperator.EQ, FilterOperator.IN],
        mode: [FilterOperator.EQ, FilterOperator.IN],
        sendAt: [FilterOperator.EQ, FilterOperator.ILIKE],
      },
    });
  }
}
