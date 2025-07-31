import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Repository } from 'typeorm';

@Injectable()
export class GroupSchooldayService {
  private readonly logger = new Logger(GroupSchooldayService.name);

  constructor(
    @InjectRepository(Schoolday)
    private readonly schooldayRepository: Repository<Schoolday>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async list(groupId: number): Promise<Schoolday[]> {
    try {
      // todo. to put response on the cache
      const schooldays = await this.schooldayRepository.find({
        where: {
          groupId: groupId,
        },
      });

      return schooldays;
    } catch (error) {
      this.logger.error(`[mysql] list error`, error);
      throw new BadRequestException('수업일 목록 조회에 실패했습니다.');
    }
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
