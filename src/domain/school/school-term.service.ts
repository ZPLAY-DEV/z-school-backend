import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { School } from 'src/domain/school/entities/school.entity';
import { CreateTermDto } from 'src/domain/term/dto/create-term.dto';
import { UpdateTermDto } from 'src/domain/term/dto/update-term.dto';
import { Term } from 'src/domain/term/entities/term.entity';
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
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async list(schoolId: number): Promise<Term[]> {
    const queryBuilder = this.termRepository
      .createQueryBuilder('term')
      .where('term.schoolId = :schoolId', { schoolId })
      .orderBy('term.schoolYear', 'ASC')
      .addOrderBy('term.start', 'ASC')
      // .orderBy('start', 'DESC') // todo. 근데, 최신순으로 보여주는 것이 필요할 것 아닌가?
      .take(10); // todo. 학년 종료후 매년 reset 한다고 했으니까 학기의 갯수는 10개로 충분?

    return await queryBuilder.getMany();
  }

  // async infiniteList(
  //   schoolId: number,
  //   query: PaginateQuery,
  // ): Promise<Paginated<Term>> {
  //   const queryBuilder = this.termRepository
  //     .createQueryBuilder('term')
  //     .where('term.schoolId = :schoolId', { schoolId });

  //   return await paginate(query, queryBuilder, {
  //     sortableColumns: ['schoolYear', 'start'],
  //     searchableColumns: ['schoolYear', 'termName'],
  //     defaultSortBy: [
  //       ['schoolYear', 'ASC'],
  //       ['start', 'ASC'],
  //     ],
  //     filterableColumns: {
  //       schoolYear: [FilterOperator.EQ],
  //       name: [FilterOperator.EQ, FilterOperator.ILIKE],
  //     },
  //   });
  // }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  async update(termId: number, dto: UpdateTermDto): Promise<Term> {
    const term = await this.termRepository.findOne({
      where: { id: termId, schoolId: dto.schoolId },
    });
    if (!term) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_TERM);
    }
    // 업데이트
    return this.termRepository.save({
      ...term,
      ...dto,
    });
  }
}
