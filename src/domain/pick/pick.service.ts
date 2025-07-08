import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Actor } from 'src/common/enums';
import { Group } from 'src/domain/group/entities/group.entity';
import { CreatePickDto, EndPickDto } from 'src/domain/pick/dto/create-pick.dto';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { Repository } from 'typeorm';
import { UpdateGroupDto } from '../group/dto/update-group.dto';

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

  // 필수항목) groupId, studentId, start, note (수동으로 등록시)
  async createPick(dtos: CreatePickDto[], role: Actor): Promise<number> {
    const groupId = dtos[0].groupId;
    const groupWithLesson = await this.groupRepository.findOneOrFail({
      where: {
        id: groupId,
      },
      relations: ['lesson'],
    });
    const end = groupWithLesson.lesson.end;
    const newDtos = dtos.map((dto) => ({
      ...dto,
      startedBy: role,
      end: end,
    }));

    const picks = await this.pickRepository.upsert(newDtos, {
      conflictPaths: ['groupId', 'offeringId', 'studentId'],
      skipUpdateIfNoValuesChanged: true,
    });

    // return number of affected rows (upsert doesn't have affected, so return identifiers length)
    return picks.identifiers?.length ?? dtos.length;
  }

  async endPick(dto: EndPickDto): Promise<Pick> {
    const pick = await this.findPickByGroupIdAndStudentId(
      dto.groupId,
      dto.studentId,
    );
    if (!pick) {
      throw new NotFoundException('pick entity not found');
    }
    await this.pickRepository.update(pick.id, {
      note: dto.note,
      endedBy: dto.endedBy,
      end: dto.end,
    });

    pick.note = dto.note ?? null;
    pick.endedBy = dto.endedBy ?? Actor.OTHER;
    pick.end = dto.end;

    return pick;
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  async findPickByGroupIdAndStudentId(
    groupId: number,
    studentId: number,
  ): Promise<Pick> {
    return await this.pickRepository.findOneOrFail({
      where: { groupId, studentId },
    });
  }

  async listStudents(groupId: number): Promise<Pick[]> {
    return await this.pickRepository.find({
      where: { groupId },
      relations: ['student', 'student.parent'],
    });
  }

  async studentInfiniteList(
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
        startedBy: true,
        endedBy: true,
        note: true,
      },
    });
  }

  async listGroups(studentId: number): Promise<Pick[]> {
    return await this.pickRepository.find({
      where: { studentId },
      relations: ['group', 'group.lesson'],
    });
  }

  async groupInfiniteList(
    studentId: number,
    query: PaginateQuery,
  ): Promise<Paginated<Pick>> {
    const queryBuilder = this.pickRepository
      .createQueryBuilder('pick')
      .where('pick.studentId = :studentId', { studentId });

    return await paginate(query, queryBuilder, {
      relations: {
        group: {
          lesson: true,
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

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateGroupDto): Promise<Pick> {
    const group = await this.pickRepository.preload({
      id,
      ...dto,
    });
    if (!group) {
      throw new NotFoundException(`Pick not found`);
    }
    return await this.pickRepository.save(group);
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  async remove(id: number): Promise<Pick> {
    const pick = await this.pickRepository.findOneOrFail({
      where: { id },
    });
    await this.pickRepository.softRemove(pick);
    return pick;
  }
}
