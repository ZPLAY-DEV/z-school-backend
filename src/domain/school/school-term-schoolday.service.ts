import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { format, isValid, parse } from 'date-fns';
import {
  FilterOperator,
  paginate,
  PaginateConfig,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SchoolTermSchooldayService {
  private readonly logger = new Logger(SchoolTermSchooldayService.name);

  constructor(
    @InjectRepository(Schoolday)
    private readonly schooldayRepository: Repository<Schoolday>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Private Methods
  //? ---------------------------------------------------------------------- ?//

  private validateDate(date: string): void {
    // YYYY-MM-DD 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new BadRequestException('날짜는 YYYY-MM-DD 형식이어야 합니다.');
    }

    // 유효한 날짜인지 검증
    const parsedDate = parse(date, 'yyyy-MM-dd', new Date());
    if (!isValid(parsedDate)) {
      throw new BadRequestException('유효하지 않은 날짜입니다.');
    }

    // 파싱된 날짜가 원본 문자열과 일치하는지 확인 (예: 2025-02-30 같은 경우)
    const formattedDate = format(parsedDate, 'yyyy-MM-dd');
    if (formattedDate !== date) {
      throw new BadRequestException('유효하지 않은 날짜입니다.');
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async list(
    schoolId: number,
    termId: number,
    date?: string,
  ): Promise<Schoolday[]> {
    const queryBuilder = this.schooldayRepository
      .createQueryBuilder('schoolday')
      .leftJoinAndSelect('schoolday.group', 'group')
      .where('schoolday.schoolId = :schoolId', { schoolId })
      .andWhere('schoolday.termId = :termId', { termId });

    if (date) {
      this.validateDate(date);
      // 성능 최적화: DATE() 함수 대신 날짜 범위 쿼리 사용
      const startDate = `${date} 00:00:00`;
      const endDate = `${date} 23:59:59`;
      queryBuilder.andWhere(
        'schoolday.startsAt >= :startDate AND schoolday.startsAt <= :endDate',
        {
          startDate,
          endDate,
        },
      );
    }

    return await queryBuilder.getMany();
  }

  //? 학교 학기의 수업일 목록 조회 (페이지네이션)
  async infiniteList(
    query: PaginateQuery,
    schoolId: number,
    termId: number,
    date?: string,
  ): Promise<Paginated<Schoolday>> {
    const queryBuilder = this.schooldayRepository
      .createQueryBuilder('schoolday')
      .leftJoinAndSelect('schoolday.group', 'group')
      .where('schoolday.schoolId = :schoolId', { schoolId })
      .andWhere('schoolday.termId = :termId', { termId });

    if (date) {
      this.validateDate(date);
      // 성능 최적화: DATE() 함수 대신 날짜 범위 쿼리 사용
      const startDate = `${date} 00:00:00`;
      const endDate = `${date} 23:59:59`;
      queryBuilder.andWhere(
        'schoolday.startsAt >= :startDate AND schoolday.startsAt <= :endDate',
        {
          startDate,
          endDate,
        },
      );
    }

    const config: PaginateConfig<Schoolday> = {
      sortableColumns: ['id', 'startsAt', 'endsAt'],
      defaultSortBy: [['startsAt', 'ASC']],
      filterableColumns: {
        name: [FilterOperator.ILIKE],
        'group.groupName': [FilterOperator.ILIKE],
      },
    };

    return await paginate(query, queryBuilder, config);
  }
}
