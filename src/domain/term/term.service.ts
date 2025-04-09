import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { CreateTermDto } from 'src/domain/term/dto/create-term.dto';
import { UpdateTermDto } from 'src/domain/term/dto/update-term.dto';
import { Term } from 'src/domain/term/entities/term.entity';
import { S3Service } from 'src/services/aws/s3.service';
import { Repository } from 'typeorm';

@Injectable()
export class TermService {
  constructor(
    @InjectRepository(Term)
    private readonly termRepository: Repository<Term>,
    private readonly s3Service: S3Service,
  ) {}

  //?-------------------------------------------------------------------------//
  //? CREATE
  //?-------------------------------------------------------------------------//

  async create(dto: CreateTermDto): Promise<Term> {
    const item = this.termRepository.create(dto);
    return await this.termRepository.save(item);
  }

  //?-------------------------------------------------------------------------//
  //? READ
  //?-------------------------------------------------------------------------//

  async findAll(query: PaginateQuery): Promise<Paginated<Term>> {
    const queryBuilder = this.termRepository.createQueryBuilder('term');
    return await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'name'],
      searchableColumns: ['name'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        isActive: [FilterOperator.EQ],
        termType: [FilterOperator.EQ],
      },
    });
  }

  async findActive(): Promise<Term[]> {
    return await this.termRepository
      .createQueryBuilder('term')
      .orderBy('term.id', 'DESC')
      .where({ isActive: true })
      .getMany();
  }

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
      throw new NotFoundException('entity not found');
    }
  }

  //?-------------------------------------------------------------------------//
  //? UPDATE
  //?-------------------------------------------------------------------------//

  async update(id: number, dto: UpdateTermDto): Promise<Term> {
    const term = await this.termRepository.preload({ id, ...dto });
    if (!term) {
      throw new NotFoundException(`entity not found`);
    }
    return await this.termRepository.save(term);
  }

  //?-------------------------------------------------------------------------//
  //? DELETE
  //?-------------------------------------------------------------------------//

  // note that this is hard-delete
  async remove(id: number): Promise<Term> {
    const term = await this.findById(id);
    return await this.termRepository.remove(term);
  }
}
