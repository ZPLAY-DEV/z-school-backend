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
import { User } from 'src/domain/user/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ManagerService {
  constructor(
    @InjectRepository(Manager)
    private readonly managerRepository: Repository<Manager>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  //?-------------------------------------------------------------------------//
  //? CREATE
  //?-------------------------------------------------------------------------//

  async create(dto: CreateManagerDto): Promise<Manager> {
    const manager = this.managerRepository.create(dto);
    return await this.managerRepository.save(manager);
  }

  //?-------------------------------------------------------------------------//
  //? READ
  //?-------------------------------------------------------------------------//

  async findAll(query: PaginateQuery): Promise<Paginated<Manager>> {
    const queryBuilder = this.managerRepository
      .createQueryBuilder('manager')
      .leftJoinAndSelect('manager.user', 'user')
      .loadRelationCountAndMap('manager.commentCount', 'manager.comments')
      .orderBy('manager.id', 'DESC');

    return await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'name', 'phone', 'note'],
      searchableColumns: ['name'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        category: [FilterOperator.EQ],
        isPrivate: [FilterOperator.EQ],
      },
    });
  }

  async find(): Promise<Manager[]> {
    return await this.managerRepository
      .createQueryBuilder('manager')
      .orderBy('id', 'DESC')
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
      throw new NotFoundException('entity not found');
    }
  }

  //?-------------------------------------------------------------------------//
  //? UPDATE
  //?-------------------------------------------------------------------------//

  async update(id: number, dto: UpdateManagerDto): Promise<Manager> {
    const manager = await this.managerRepository.preload({ id, ...dto });
    if (!manager) {
      throw new NotFoundException(`entity not found`);
    }
    return await this.managerRepository.save(manager);
  }

  //?-------------------------------------------------------------------------//
  //? DELETE
  //?-------------------------------------------------------------------------//

  // note that this is hard-delete
  async remove(id: number): Promise<Manager> {
    const manager = await this.findById(id);
    return await this.managerRepository.remove(manager);
  }
}
