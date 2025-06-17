import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { School } from 'src/domain/school/entities/school.entity';
import { CreateTermDto } from 'src/domain/term/dto/create-term.dto';
import { UpdateTermDto } from 'src/domain/term/dto/update-term.dto';
import { Term } from 'src/domain/term/entities/term.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TermService {
  constructor(
    @InjectRepository(Term)
    private readonly termRepository: Repository<Term>,
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
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
      throw new NotFoundException('School not found');
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
      throw new BadRequestException('Duplicate term');
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

  async findById(id: number, relations: string[] = []): Promise<Term> {
    try {
      return relations.length > 0
        ? await this.termRepository.findOneOrFail({
            where: { id },
            relations,
          })
        : await this.termRepository.findOneOrFail({
            where: { id },
          });
    } catch (error) {
      console.error(error);
      throw new NotFoundException('Term not found');
    }
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

  async update(id: number, dto: UpdateTermDto): Promise<Term> {
    const term = await this.termRepository.preload({
      id,
      ...dto,
    });
    if (!term) {
      throw new NotFoundException('Term not found');
    }
    // 업데이트
    return this.termRepository.save(term);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  async softRemove(id: number): Promise<Term> {
    const term = await this.findById(id);
    return await this.termRepository.softRemove(term);
  }
}
