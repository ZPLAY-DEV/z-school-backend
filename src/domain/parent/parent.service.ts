import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  FilterSuffix,
  paginate,
  PaginateConfig,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { DataSource, Repository } from 'typeorm';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';

@Injectable()
export class ParentService {
  private readonly logger = new Logger(ParentService.name);

  constructor(
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
    private dataSource: DataSource, // for transaction
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  //* 결제 완료하지 않은 같은 옵션의 parent 가 있다면 재활용 (by using parentHash)
  async create(dto: CreateParentDto): Promise<Parent> {
    const parent = this.parentRepository.create(dto);
    return await this.parentRepository.save(parent);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  async findAll(query: PaginateQuery): Promise<Paginated<Parent>> {
    const queryBuilder = this.parentRepository.createQueryBuilder('parent');

    const config: PaginateConfig<Parent> = {
      relations: {
        students: true,
      },
      sortableColumns: ['createdAt'],
      searchableColumns: ['name'],
      defaultSortBy: [['createdAt', 'DESC']],
      filterableColumns: {
        id: [FilterOperator.EQ, FilterOperator.IN],
        name: [FilterOperator.EQ, FilterOperator.ILIKE],
        status: [FilterOperator.EQ, FilterOperator.IN],
        support: [
          FilterOperator.EQ,
          FilterOperator.IN,
          FilterOperator.NULL,
          FilterSuffix.NOT,
        ],
      },
    };

    return await paginate(query, queryBuilder, config);
  }

  async findById(id: string, relations: string[] = []): Promise<Parent> {
    try {
      return relations.length > 0
        ? await this.parentRepository.findOneOrFail({
            where: { id: Number(id) },
            relations,
          })
        : await this.parentRepository.findOneOrFail({
            where: { id: Number(id) },
          });
    } catch (error) {
      this.logger.error(error);
      throw new NotFoundException(error.message);
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateParentDto): Promise<Parent> {
    const parent = await this.parentRepository.preload({ id, ...dto });
    if (!parent) {
      throw new NotFoundException(`Parent not found`);
    }
    return await this.parentRepository.save(parent);
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  async remove(id: string) {
    const parent = await this.findById(id);
    return await this.parentRepository.remove(parent);
  }
}
