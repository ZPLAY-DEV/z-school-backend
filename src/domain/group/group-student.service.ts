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
import { CreateGroupStudentDto } from 'src/domain/group/dto/create-group-student.dto';
import { UpdateGroupStudentDto } from 'src/domain/group/dto/update-group-student.dto';
import { GroupStudent } from 'src/domain/group/entities/group-student.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Repository } from 'typeorm';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupStudentService {
  private readonly logger = new Logger(GroupStudentService.name);

  constructor(
    @InjectRepository(GroupStudent)
    private readonly groupStudentRepository: Repository<GroupStudent>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  // 학생 개별등록 w/ note and enrolledBy
  async create(dto: CreateGroupStudentDto): Promise<GroupStudent> {
    const groupStudent = this.groupStudentRepository.create(dto);
    return await this.groupStudentRepository.save(groupStudent);
  }

  async createBulk(
    groupId: number,
    studentIds: number[],
  ): Promise<GroupStudent[]> {
    const groupStudents: GroupStudent[] = [];
    for (const studentId of studentIds) {
      const groupStudent = this.groupStudentRepository.create({
        groupId,
        studentId,
        enrolledBy: Actor.SYSTEM,
      });
      groupStudents.push(groupStudent);
    }
    return await this.groupStudentRepository.save(groupStudents);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  async list(groupId: number): Promise<GroupStudent[]> {
    return await this.groupStudentRepository.find({
      where: { groupId },
      relations: ['student', 'student.parent'],
    });
  }

  async infiniteList(
    groupId: number,
    query: PaginateQuery,
  ): Promise<Paginated<GroupStudent>> {
    const queryBuilder = this.groupStudentRepository
      .createQueryBuilder('groupStudent')
      .where('groupStudent.groupId = :groupId', { groupId });

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
  // ): Promise<GroupStudent> {
  //   try {
  //     return relations.length > 0
  //       ? await this.groupStudentRepository.findOneOrFail({
  //           where: { groupId, studentId },
  //           relations,
  //         })
  //       : await this.groupStudentRepository.findOneOrFail({
  //           where: { groupId, studentId },
  //         });
  //   } catch (error) {
  //     this.logger.error(error);
  //     throw new NotFoundException('entity not found');
  //   }
  // }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  async update(
    groupId: number,
    studentId: number,
    dto: UpdateGroupDto,
  ): Promise<GroupStudent> {
    const group = await this.groupStudentRepository.preload({
      groupId,
      studentId,
      ...dto,
    });
    if (!group) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_ENTITY);
    }
    return await this.groupStudentRepository.save(group);
  }

  //?-------------------------------------------------------------------------//
  //? DELETE
  //?-------------------------------------------------------------------------//

  async remove(dto: UpdateGroupStudentDto): Promise<void> {
    const groupStudent = await this.groupStudentRepository.findOneOrFail({
      where: { groupId: dto.groupId, studentId: dto.studentId },
    });

    await this.groupStudentRepository.update(groupStudent.id, {
      note: dto.note,
      deletedBy: dto.deletedBy,
      deletedAt: new Date(),
    });
  }
}
