import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Actor } from 'src/common/enums';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { CreatePickDto } from 'src/domain/group/dto/create-group-student.dto';
import { UpdatePickDto } from 'src/domain/group/dto/update-group-student.dto';
import { Group } from 'src/domain/group/entities/group.entity';
import { Pick } from 'src/domain/group/entities/pick.entity';
import { Repository } from 'typeorm';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class PickService {
  private readonly logger = new Logger(PickService.name);

  constructor(
    @InjectRepository(Pick)
    private readonly pickRepository: Repository<Pick>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  // 학생 개별등록 w/ note and enrolledBy
  async create(dto: CreatePickDto): Promise<Pick> {
    const pick = this.pickRepository.create(dto);
    return await this.pickRepository.save(pick);
  }

  async createBulk(groupId: number, studentIds: number[]): Promise<Pick[]> {
    const picks: Pick[] = [];
    for (const studentId of studentIds) {
      const pick = this.pickRepository.create({
        groupId,
        studentId,
        enrolledBy: Actor.SYSTEM,
      });
      picks.push(pick);
    }
    return await this.pickRepository.save(picks);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  async list(groupId: number): Promise<Pick[]> {
    return await this.pickRepository.find({
      where: { groupId },
      relations: ['student', 'student.parent'],
    });
  }

  async infiniteList(
    groupId: number,
    query: PaginateQuery,
  ): Promise<Paginated<Pick>> {
    const queryBuilder = this.pickRepository
      .createQueryBuilder('pick')
      .where('pick.groupId = :groupId', { groupId });

    return await paginate(query, queryBuilder, {
      relations: {
        student: {
          parent: true,
        },
      },
      sortableColumns: ['id'],
      searchableColumns: ['note'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        enrolledBy: [FilterOperator.EQ],
        deletedBy: [FilterOperator.EQ],
      },
    });
  }

  // no reason to use this at this moment
  // async findByUniqueIds(
  //   groupId: number,
  //   studentId: number,
  //   relations: string[] = [],
  // ): Promise<Pick> {
  //   try {
  //     return relations.length > 0
  //       ? await this.pickRepository.findOneOrFail({
  //           where: { groupId, studentId },
  //           relations,
  //         })
  //       : await this.pickRepository.findOneOrFail({
  //           where: { groupId, studentId },
  //         });
  //   } catch (error) {
  //     this.logger.error(error);
  //     throw new NotFoundException(HttpErrorConstants.NOT_FOUND_ENTITY);
  //   }
  // }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  async update(
    groupId: number,
    studentId: number,
    dto: UpdateGroupDto,
  ): Promise<Pick> {
    const group = await this.pickRepository.preload({
      groupId,
      studentId,
      ...dto,
    });
    if (!group) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_ENTITY);
    }
    return await this.pickRepository.save(group);
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  async remove(dto: UpdatePickDto): Promise<void> {
    const pick = await this.pickRepository.findOneOrFail({
      where: { groupId: dto.groupId, studentId: dto.studentId },
    });

    await this.pickRepository.update(pick.id, {
      note: dto.note,
      deletedBy: dto.deletedBy,
      deletedAt: new Date(),
    });
  }
}
