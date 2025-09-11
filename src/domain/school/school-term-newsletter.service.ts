import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FilterOperator, paginate, PaginateQuery } from 'nestjs-paginate';
import { NewsletterType } from 'src/common/enums/newsletter-type';
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
  //? Create
  //? ---------------------------------------------------------------------- ?//

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async getRegistrationNewsletter(
    schoolId: number,
    termId: number,
  ): Promise<Newsletter> {
    return await this.newsletterRepository.findOneOrFail({
      where: {
        schoolId,
        termId,
        type: NewsletterType.REGISTRATION,
      },
      relations: ['dispatches', 'dispatches.shortlinks'],
      order: { id: 'DESC' },
    });
  }

  async list(
    schoolId: number,
    termId?: number,
    type?: NewsletterType,
  ): Promise<Newsletter[]> {
    const whereCondition: any = { schoolId };

    if (termId !== undefined) {
      whereCondition.termId = termId;
    }

    if (type !== undefined) {
      whereCondition.type = type;
    }

    return await this.newsletterRepository.find({
      where: whereCondition,
      order: { id: 'DESC' },
    });
  }

  async infiniteList(
    schoolId: number,
    query: PaginateQuery,
    termId?: number,
    type?: NewsletterType,
  ) {
    const queryBuilder = this.newsletterRepository
      .createQueryBuilder('newsletter')
      .where('newsletter.schoolId = :schoolId', { schoolId });

    if (termId !== undefined) {
      queryBuilder.andWhere('newsletter.termId = :termId', { termId });
    }

    if (type !== undefined) {
      queryBuilder.andWhere('newsletter.type = :type', { type });
    }

    return await paginate<Newsletter>(query, queryBuilder, {
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
