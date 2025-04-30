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
import { Repository } from 'typeorm';
// import { UpdateTermDto } from '../term/dto/update-term.dto';

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

    // 2. 학기 중복 여부 조회
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

    // 3. 생성
    const newTerm = this.termRepository.create({
      ...dto,
      schoolName: dto.schoolName ?? school.name,
    });
    return this.termRepository.save(newTerm);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  // async update(id: number, dto: UpdateTermDto) {
  //   const term = await this.termRepository.findOne({
  //     where: { id },
  //   });
  //   if (!term) {
  //     throw new NotFoundException(HttpErrorConstants.NOT_FOUND_TERM);
  //   }
  //   // 2. 학기 중복 여부 조회
  //   const existingTerm = await this.termRepository.findOne({
  //     where: {
  //       schoolId: dto.schoolId,
  //       termName: dto.termName,
  //       schoolYear: dto.schoolYear,
  //     },
  //   });
  //   if (existingTerm) {
  //     throw new BadRequestException(HttpErrorConstants.DUPLICATE_TERM);
  //   }
  //   // 3. 업데이트
  //   return this.termRepository.save({
  //     ...term,
  //     ...dto,
  //   });
  // }

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
      .where('term.schoolId = :schoolId', { schoolId })
      .orderBy('term.schoolYear', 'DESC')
      .addOrderBy('term.id', 'DESC');

    return await queryBuilder.getMany();
  }
}
