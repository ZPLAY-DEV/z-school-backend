import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FilterOperator, paginate, PaginateQuery } from 'nestjs-paginate';
import { DataSource, Repository } from 'typeorm';
import { Dispatch } from '../dispatch/entities/dispatch.entity';

@Injectable()
export class SchoolDispatchService {
  private readonly logger = new Logger(SchoolDispatchService.name);

  constructor(
    @InjectRepository(Dispatch)
    private readonly dispatchRepository: Repository<Dispatch>,
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
    return await paginate<Dispatch>(query, queryBuilder, {
      sortableColumns: ['id'],
      searchableColumns: ['title', 'body', 'sentAt'],
      defaultSortBy: [['id', 'ASC']],
      filterableColumns: {
        type: [FilterOperator.EQ, FilterOperator.IN],
        mode: [FilterOperator.EQ, FilterOperator.IN],
        sentAt: [FilterOperator.EQ, FilterOperator.ILIKE],
      },
    });
  }
}
