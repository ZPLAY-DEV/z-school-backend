import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class GroupSchooldayService {
  private readonly logger = new Logger(GroupSchooldayService.name);

  constructor(
    @InjectRepository(Schoolday)
    private readonly schooldayRepository: Repository<Schoolday>,
    private readonly dataSource: DataSource,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async list(groupId: number, date?: string): Promise<Schoolday[]> {
    const queryBuilder = this.dataSource
      .createQueryBuilder(Schoolday, 'schoolday')
      .leftJoin('schoolday.group', 'group')
      .where('schoolday.groupId = :groupId', { groupId: groupId });

    if (date) {
      // "2025-08" 형태의 문자열을 파싱하여 해당 월의 시작일과 마지막일 계산
      const [year, month] = date.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1); // 월은 0부터 시작하므로 -1
      const endDate = new Date(year, month, 0); // 다음 달의 0일 = 이번 달의 마지막일

      queryBuilder.andWhere('schoolday.startsAt >= :startDate', {
        startDate,
      });
      queryBuilder.andWhere('schoolday.startsAt <= :endDate', {
        endDate,
      });
    }

    return await queryBuilder.getMany();
  }

  async infiniteList(
    groupId: number,
    query: PaginateQuery,
  ): Promise<Paginated<Schoolday>> {
    const queryBuilder = this.schooldayRepository
      .createQueryBuilder('schoolday')
      .where('groupId = :groupId', { groupId });

    return await paginate<Schoolday>(query, queryBuilder, {
      relations: {
        departures: true,
      },
      sortableColumns: ['id'],
      searchableColumns: ['name'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        schoolId: [FilterOperator.EQ],
        termId: [FilterOperator.EQ],
        lessonId: [FilterOperator.EQ],
      },
    });
  }
}
