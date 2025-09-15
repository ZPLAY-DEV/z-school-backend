import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { getKoreanWeekday } from 'src/helpers/date';
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
      const endDate = new Date(year, month, 0, 23, 59, 59, 999); // 이번 달의 마지막일 23:59:59.999

      // startsAt이 기간 안에 있는 경우를 처리 (datetime 비교로 효율성 향상)
      queryBuilder.andWhere(
        'schoolday.startsAt >= :startDate AND schoolday.startsAt <= :endDate',
        {
          startDate,
          endDate,
        },
      );
    }

    const schooldays = await queryBuilder.getMany();

    // original이 null이 아닌 아이템들에 대해 중복 아이템 생성
    const result: Schoolday[] = [];

    for (const schoolday of schooldays) {
      // 원본 아이템 추가 (id는 그대로 유지)
      result.push(schoolday);
      // original이 null이 아닌 경우 중복 아이템 생성 (id만 0으로 설정)
      if (schoolday.original !== null) {
        const duplicateItem = {
          ...schoolday,
          id: 0,
          today: schoolday.original,
          original: schoolday.today,
          weekday: getKoreanWeekday(schoolday.original),
        };
        result.push(duplicateItem);
      }
    }

    // weekday 순차적으로 정렬
    result.sort((a, b) => Number(a.weekNumber) - Number(b.weekNumber));

    return result;
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
