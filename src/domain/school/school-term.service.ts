import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { School } from 'src/domain/school/entities/school.entity';
import { CreateTermDto } from 'src/domain/term/dto/create-term.dto';
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
    const school = await this.schoolRepository.findOne({
      where: { id: dto.schoolId },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const existingTerm = await this.termRepository.findOne({
      where: {
        termName: dto.termName,
        schoolId: dto.schoolId,
        schoolYear: dto.schoolYear,
      },
    });

    if (existingTerm) {
      const updatedTerm = this.termRepository.merge(existingTerm, {
        ...dto,
        schoolName: dto.schoolName ?? school.name,
      });
      return this.termRepository.save(updatedTerm);
    } else {
      const newTerm = this.termRepository.create({
        ...dto,
        schoolName: dto.schoolName ?? school.name,
      });
      return this.termRepository.save(newTerm);
    }
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
