import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
      throw new NotFoundException(`School with id ${dto.schoolId} not found`);
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
      throw new BadRequestException(`Term already exists for the given period`);
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

  // todo. 최신순으로 보여줘야 하는 지 확인 필요
  async list(schoolId: number): Promise<Term[]> {
    const queryBuilder = this.termRepository
      .createQueryBuilder('term')
      .where('term.schoolId = :schoolId', { schoolId })
      .orderBy('term.schoolYear', 'ASC')
      .addOrderBy('term.start', 'ASC');
    // .orderBy('start', 'DESC')

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
      throw new NotFoundException(`Term not found`);
    }
    // 업데이트
    return this.termRepository.save({
      ...term,
      ...dto,
    });
  }
}
