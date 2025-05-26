import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  PaginateQuery,
  Paginated,
  paginate,
} from 'nestjs-paginate';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { School } from 'src/domain/school/entities/school.entity';
import { UpdateSchooldayDto } from 'src/domain/schoolday/dto/update-schoolday.dto';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Repository } from 'typeorm';
@Injectable()
export class SchooldayService {
  private readonly logger = new Logger(SchooldayService.name);

  constructor(
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
    @InjectRepository(Schoolday)
    private readonly schooldayRepository: Repository<Schoolday>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  async create(): Promise<any> {
    const school = await this.schoolRepository.findOne({
      where: { id: 1 },
    });
    if (!school) {
      return;
    }
    // const schoolday = this.schooldayRepository.create(dto);
    // return await this.schooldayRepository.save(schoolday);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async findAll(query: PaginateQuery): Promise<Paginated<Schoolday>> {
    const queryBuilder =
      this.schooldayRepository.createQueryBuilder('schoolday');

    return await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'name'],
      searchableColumns: ['name'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        code: [FilterOperator.EQ],
      },
    });
  }

  async findById(id: number, relations: string[] = []): Promise<Schoolday> {
    try {
      return relations.length > 0
        ? await this.schooldayRepository.findOneOrFail({
            where: { id },
            relations,
          })
        : await this.schooldayRepository.findOneOrFail({
            where: { id },
          });
    } catch (error) {
      this.logger.error(error);
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_ENTITY);
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateSchooldayDto): Promise<Schoolday> {
    const schoolday = await this.schooldayRepository.preload({ id, ...dto });
    if (!schoolday) {
      throw new NotFoundException(`entity not found`);
    }
    return await this.schooldayRepository.save(schoolday);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  // note that this is hard-delete
  async remove(id: number): Promise<Schoolday> {
    const schoolday = await this.findById(id);
    return await this.schooldayRepository.remove(schoolday);
  }
}
