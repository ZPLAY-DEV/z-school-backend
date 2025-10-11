import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FilterOperator, paginate, PaginateQuery } from 'nestjs-paginate';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SchoolTermNewsletterService {
  private readonly logger = new Logger(SchoolTermNewsletterService.name);

  constructor(
    @InjectRepository(Newsletter)
    private readonly newsletterRepository: Repository<Newsletter>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async list(schoolId: number, termId?: number): Promise<Newsletter[]> {
    const whereCondition: any = { schoolId };

    if (termId !== undefined) {
      whereCondition.termId = termId;
    }

    return await this.newsletterRepository.find({
      where: whereCondition,
      order: { id: 'DESC' },
    });
  }

  async infiniteList(schoolId: number, query: PaginateQuery, termId?: number) {
    const queryBuilder = this.newsletterRepository
      .createQueryBuilder('newsletter')
      .where('newsletter.schoolId = :schoolId', { schoolId });

    if (termId !== undefined) {
      queryBuilder.andWhere('newsletter.termId = :termId', { termId });
    }

    return await paginate<Newsletter>(query, queryBuilder, {
      relations: ['notifiable'],
      sortableColumns: ['id'],
      searchableColumns: ['title', 'body'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        type: [FilterOperator.EQ, FilterOperator.IN],
        mode: [FilterOperator.EQ, FilterOperator.IN],
      },
    });
  }
}
