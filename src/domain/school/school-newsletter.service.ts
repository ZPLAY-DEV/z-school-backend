import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FilterOperator, paginate, PaginateQuery } from 'nestjs-paginate';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class SchoolNewsletterService {
  private readonly logger = new Logger(SchoolNewsletterService.name);

  constructor(
    @InjectRepository(Newsletter)
    private readonly dispatchRepository: Repository<Newsletter>,
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
    return await paginate<Newsletter>(query, queryBuilder, {
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
