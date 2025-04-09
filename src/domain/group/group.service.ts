import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { CreateGroupDto } from 'src/domain/group/dto/create-group.dto';
import { Group } from 'src/domain/group/entities/group.entity';
import { Repository } from 'typeorm';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupService {
  private readonly logger = new Logger(GroupService.name);

  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateGroupDto): Promise<Group> {
    const group = this.groupRepository.create(dto);
    return await this.groupRepository.save(group);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  async findAll(query: PaginateQuery): Promise<Paginated<Group>> {
    return await paginate(query, this.groupRepository, {
      sortableColumns: ['createdAt'],
      nullSort: 'last',
      defaultSortBy: [['id', 'DESC']],
      searchableColumns: ['className', 'classLocation'],
      filterableColumns: {
        instructorId: [FilterOperator.EQ],
      },
    });
  }

  async findById(id: number, relations: string[] = []): Promise<Group> {
    try {
      return relations.length > 0
        ? await this.groupRepository.findOneOrFail({
            where: { id },
            relations,
          })
        : await this.groupRepository.findOneOrFail({
            where: { id },
          });
    } catch (error) {
      this.logger.error(error);
      throw new NotFoundException('entity not found');
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateGroupDto): Promise<Group> {
    const group = await this.groupRepository.preload({
      id,
      ...dto,
    });
    if (!group) {
      throw new NotFoundException(`entity not found`);
    }
    return await this.groupRepository.save(group);
  }

  //?-------------------------------------------------------------------------//
  //? DELETE
  //?-------------------------------------------------------------------------//

  async remove(id: number): Promise<Group> {
    const group = await this.findById(id);
    return await this.groupRepository.remove(group);
  }
}
