import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Actor } from 'src/common/enums';
import { Group } from 'src/domain/group/entities/group.entity';
import { CreateBulkPickDto } from 'src/domain/pick/dto/create-bulk-pick.dto';
import { CreatePickDto, EndPickDto } from 'src/domain/pick/dto/create-pick.dto';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { In, Repository } from 'typeorm';
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

  // 필수항목) groupId, studentId, startedOn, note (수동으로 등록시)
  async startPick(dto: CreatePickDto): Promise<Pick> {
    const pick = this.pickRepository.create(dto);
    return await this.pickRepository.save(pick);
  }

  // 필수항목) groupId, studentId (무조건 시스템 등록이라 가정)
  async createBulk(dto: CreateBulkPickDto): Promise<Pick[]> {
    const group = await this.groupRepository.findOneOrFail({
      where: { id: dto.groupId },
      relations: ['schooldays'],
    });
    if (!group.schooldays || group.schooldays.length === 0) {
      throw new NotFoundException('Group not found');
    }
    const { startsAt } = group.schooldays[0];
    const seoulTime = toZonedTime(startsAt, 'Asia/Seoul');
    const startedOn = format(seoulTime, 'yyyy-MM-dd');

    const picks: Partial<Pick>[] = dto.studentIds.map((studentId) => ({
      groupId: dto.groupId,
      studentId,
      startedBy: Actor.SYSTEM,
      startedOn,
    }));

    // upsert based on unique constraint: groupId, studentId
    await this.pickRepository.upsert(picks, ['groupId', 'studentId']);

    // refetch the upserted picks to return full entities
    return await this.pickRepository.find({
      where: { groupId: dto.groupId, studentId: In(dto.studentIds) },
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  async listStudents(groupId: number): Promise<Pick[]> {
    return await this.pickRepository.find({
      where: { groupId },
      relations: ['student', 'student.parent'],
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

  async endPick(dto: EndPickDto): Promise<Pick> {
    const pick = await this.pickRepository.findOneOrFail({
      where: { groupId: dto.groupId, studentId: dto.studentId },
    });
    await this.pickRepository.update(pick.id, {
      note: dto.note,
      endedBy: dto.endedBy,
      endedOn: dto.endedOn,
    });

    // pick 객체에 dto 값 반영 (Pick entity 타입에 맞게 null 허용)
    pick.note = dto.note;
    pick.endedBy = dto.endedBy ?? null;
    pick.endedOn = dto.endedOn;

    return pick;
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
