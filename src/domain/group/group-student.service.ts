import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { ClassStatus } from 'src/common/enums';
import { RemovalStatus } from 'src/common/enums/removal-status';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { CreateGroupDto } from 'src/domain/group/dto/create-group.dto';
import { DeleteGroupDto } from 'src/domain/group/dto/delete-group.dto';
import { Group } from 'src/domain/group/entities/group.entity';
import { Repository } from 'typeorm';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupStudentService {
  private readonly logger = new Logger(GroupStudentService.name);

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
      searchableColumns: ['groupName', 'location'],
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

  async remove(id: number, dto: DeleteGroupDto): Promise<RemovalStatus> {
    const group = await this.findById(id);

    try {
      if (group.status === ClassStatus.PENDING) {
        await this.groupRepository.remove(group);
        return RemovalStatus.DELETED;
      }
    } catch (error) {
      this.logger.error(error);
      throw new UnprocessableEntityException(
        HttpErrorConstants.CONDITION_NOT_MET,
      );
    }

    if (group.status === ClassStatus.ACTIVE) {
      await this.groupRepository.update(id, {
        status: ClassStatus.CANCELED,
        note: dto.note,
      });
      return RemovalStatus.CANCELED;
    }

    if (group.groupStudents.length > 0) {
      throw new UnprocessableEntityException(
        HttpErrorConstants.CONDITION_NOT_MET,
      );
    }
    await this.groupRepository.update(id, {
      note: dto.note,
      deletedAt: new Date(),
    });
    return RemovalStatus.SOFT_DELETED;
  }
}
