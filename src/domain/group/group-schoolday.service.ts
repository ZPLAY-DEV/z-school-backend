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

  async list(groupId: number, monthStr?: string): Promise<Schoolday[]> {
    let year = 0;
    let month = 0;
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    const queryBuilder = this.dataSource
      .createQueryBuilder(Schoolday, 'schoolday')
      .leftJoin('schoolday.group', 'group')
      .where('schoolday.groupId = :groupId', { groupId });

    if (monthStr) {
      // "2025-08" 형태의 문자열을 파싱하여 해당 월의 시작일과 마지막일 계산
      [year, month] = monthStr.split('-').map(Number);
      this.logger.debug(
        `Parsed monthStr: ${monthStr}, year: ${year}, month: ${month}`,
      );
      startDate = new Date(year, month - 1, 1); // 월은 0-base
      endDate = new Date(year, month, 0, 23, 59, 59, 999); // 다음 달의 0일 = 이번 달 마지막 날 23:59:59.999
      // startsAt이 기간 안에 있는 경우를 처리 (datetime 비교로 효율성 향상)
      queryBuilder.andWhere(
        'schoolday.startsAt >= :startDate AND schoolday.startsAt <= :endDate',
        {
          startDate,
          endDate,
        },
      );
    }

    //! monthStr 관계없이 모두 동일한 날짜 조건으로 조회후 필터링
    queryBuilder.orWhere(
      '(schoolday.original IS NOT NULL AND schoolday.groupId = :groupId)',
      { groupId: groupId },
    );
    const schooldays = await queryBuilder
      .orderBy('schoolday.weekNumber', 'ASC')
      .getMany();

    // original이 null이 아닌 아이템들에 대해 중복 아이템 생성
    let result: Schoolday[] = [];

    for (const schoolday of schooldays) {
      result.push(schoolday);
      // original이 null이 아닌 경우 중복 아이템 생성 (id만 0으로 설정)
      if (schoolday.original !== null) {
        const duplicate = { ...schoolday };
        duplicate.id = 0;
        duplicate.today = schoolday.original;
        duplicate.original = schoolday.today;
        duplicate.weekday = getKoreanWeekday(schoolday.original);
        duplicate.note = 'red';
        result.push(duplicate);
      }
    }

    // monthStr이 있을 때 today 속성으로 월별 필터링
    if (monthStr) {
      result = result.filter((schoolday) => {
        const [, schooldayMonth] = schoolday.today.split('-').map(Number);
        return schooldayMonth === month;
      });
    }
    // today 날짜 순차적으로 정렬
    result.sort((a, b) => a.today.localeCompare(b.today));

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
