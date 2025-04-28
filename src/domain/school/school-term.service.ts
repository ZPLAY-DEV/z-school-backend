import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { School } from 'src/domain/school/entities/school.entity';
import { CreateTermDto } from 'src/domain/term/dto/create-term.dto';
import { Term } from 'src/domain/term/entities/term.entity';
import { validateDateRange } from 'src/helpers/date';
import { Repository } from 'typeorm';

@Injectable()
export class SchoolTermService {
  private readonly logger = new Logger(SchoolTermService.name);
  constructor(
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
    @InjectRepository(Term)
    private readonly termRepository: Repository<Term>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateTermDto): Promise<Term> {
    // 1. 학교 존재 여부 조회
    const school = await this.schoolRepository.findOne({
      where: { id: dto.schoolId },
    });

    if (!school) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_SCHOOL);
    }

    // 2. 날짜 범위 검증
    if (!validateDateRange(dto.start, dto.end)) {
      throw new BadRequestException(HttpErrorConstants.INVALID_DATE_RANGE);
    }

    // 3. 학기 중복 여부 조회
    const existingTerm = await this.termRepository.findOne({
      where: {
        schoolId: dto.schoolId,
        termName: dto.termName,
        schoolYear: dto.schoolYear,
      },
    });

    if (existingTerm) {
      throw new BadRequestException(HttpErrorConstants.DUPLICATE_TERM);
    }

    // 4. 생성
    const newTerm = this.termRepository.create({
      ...dto,
      schoolName: dto.schoolName ?? school.name,
    });
    return this.termRepository.save(newTerm);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async infiniteList(
    schoolId: number,
    query: PaginateQuery,
  ): Promise<Paginated<Term>> {
    const queryBuilder = this.termRepository
      .createQueryBuilder('term')
      .where('term.schoolId = :schoolId', { schoolId });

    return await paginate(query, queryBuilder, {
      relations: {
        school: true,
        lessons: true,
      },
      sortableColumns: ['id', 'schoolName', 'schoolYear', 'start', 'end'],
      searchableColumns: ['schoolName', 'termName'],
      defaultSortBy: [
        ['schoolYear', 'DESC'],
        ['id', 'DESC'],
      ],
      filterableColumns: {
        schoolYear: [FilterOperator.EQ],
        name: [FilterOperator.EQ, FilterOperator.ILIKE],
      },
    });
  }

  async list(schoolId: number): Promise<Term[]> {
    const queryBuilder = this.termRepository
      .createQueryBuilder('term')
      .leftJoinAndSelect('term.lessons', 'lessons')
      .where('term.schoolId = :schoolId', { schoolId })
      .orderBy('term.schoolYear', 'DESC')
      .addOrderBy('term.id', 'DESC');

    return await queryBuilder.getMany();
  }
}
