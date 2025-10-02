import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
    FilterOperator,
    paginate,
    Paginated,
    PaginateQuery,
} from 'nestjs-paginate';
import { CreateManagerDto } from 'src/domain/manager/dto/create-manager.dto';
import { UpdateManagerDto } from 'src/domain/manager/dto/update-manager.dto';
import { Manager } from 'src/domain/manager/entities/manager.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ManagerService {
  constructor(
    @InjectRepository(Manager)
    private readonly managerRepository: Repository<Manager>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateManagerDto): Promise<Manager> {
    const manager = this.managerRepository.create(dto);
    return await this.managerRepository.save(manager);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  async infiniteList(query: PaginateQuery): Promise<Paginated<Manager>> {
    const queryBuilder = this.managerRepository
      .createQueryBuilder('manager')
      .leftJoinAndSelect('manager.user', 'user')
      .leftJoinAndSelect('manager.affiliations', 'affiliations');

    return await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'name', 'phone'],
      searchableColumns: ['name'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        phone: [FilterOperator.EQ, FilterOperator.IN, FilterOperator.ILIKE],
      },
    });
  }

  async list(): Promise<Manager[]> {
    return await this.managerRepository
      .createQueryBuilder('manager')
      .leftJoinAndSelect('manager.user', 'user')
      .leftJoinAndSelect('manager.managerAffiliations', 'managerAffiliations')
      .orderBy('manager.id', 'DESC')
      .getMany();
  }

  async findById(id: number, relations: string[] = []): Promise<Manager> {
    try {
      return relations.length > 0
        ? await this.managerRepository.findOneOrFail({
            where: { id },
            relations,
          })
        : await this.managerRepository.findOneOrFail({
            where: { id },
          });
    } catch (error) {
      console.error(error);
      throw new NotFoundException(`Manager with not found`);
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateManagerDto): Promise<Manager> {
    const manager = await this.managerRepository.preload({ id, ...dto });
    if (!manager) {
      throw new NotFoundException(`Manager not found`);
    }
    return await this.managerRepository.save(manager);
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  // note that this is hard-delete
  async remove(id: number): Promise<Manager> {
    const manager = await this.findById(id);
    return await this.managerRepository.remove(manager);
  }
}
