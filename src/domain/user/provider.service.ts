import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  PaginateQuery,
  Paginated,
  paginate,
} from 'nestjs-paginate';
import { CreateProviderDto } from 'src/domain/user/dto/create-provider.dto';
import { UpdateProviderDto } from 'src/domain/user/dto/update-provider.dto';
import { Provider } from 'src/domain/user/entities/provider.entity';
import { FindOneOptions, Repository } from 'typeorm';

@Injectable()
export class ProviderService {
  private readonly logger = new Logger(ProviderService.name);
  constructor(
    @InjectRepository(Provider)
    private readonly repository: Repository<Provider>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateProviderDto): Promise<Provider> {
    const provider = this.repository.create(dto);
    return await this.repository.save(provider);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  async findAll(query: PaginateQuery): Promise<Paginated<Provider>> {
    return await paginate(query, this.repository, {
      sortableColumns: ['id', 'providerName'],
      searchableColumns: ['providerName'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        userId: [FilterOperator.EQ, FilterOperator.IN],
      },
    });
  }

  async findById(id: number, relations: string[] = []): Promise<Provider> {
    try {
      return relations.length > 0
        ? await this.repository.findOneOrFail({
            where: { id },
            relations,
          })
        : await this.repository.findOneOrFail({
            where: { id },
          });
    } catch (e) {
      this.logger.error(e);
      throw new NotFoundException('entity not found');
    }
  }

  async findByUniqueKey(params: FindOneOptions<Provider>): Promise<Provider> {
    const provider = await this.repository.findOne(params);
    if (!provider) throw new NotFoundException('Provider not found');
    return provider;
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateProviderDto): Promise<Provider> {
    const provider = await this.repository.preload({ id, ...dto });
    if (!provider) {
      throw new NotFoundException(`entity not found`);
    }
    return await this.repository.save(provider);
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  async remove(id: number): Promise<Provider> {
    const provider = await this.findById(id);
    return await this.repository.remove(provider);
  }
}
