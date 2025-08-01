import {
  ForbiddenException,
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
import { Actor } from 'src/common/enums';
import { Group } from 'src/domain/group/entities/group.entity';
import { CreatePickDto, EndPickDto } from 'src/domain/pick/dto/create-pick.dto';
import { UpdatePickDto } from 'src/domain/pick/dto/update-pick.dto';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { User } from 'src/domain/user/entities/user.entity';
import { isTimeConflict } from 'src/helpers/parse';
import { Repository } from 'typeorm';

@Injectable()
export class PickService {
  private readonly logger = new Logger(PickService.name);

  constructor(
    @InjectRepository(Pick)
    private readonly pickRepository: Repository<Pick>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  // 필수항목) groupId, studentId, start, note (수동으로 등록시)
  async createPick(
    dtos: CreatePickDto[],
    role: Actor,
    userId: number,
  ): Promise<number> {
    const groupId = dtos[0].groupId;
    const groupWithLesson = await this.groupRepository.findOneOrFail({
      where: {
        id: groupId,
      },
      relations: ['lesson', 'lesson.term'],
    });
    const end = groupWithLesson.lesson.end || groupWithLesson.lesson.term.end;
    const termId = groupWithLesson.lesson.termId;

    if (role === Actor.INSTRUCTOR) {
      const user = await this.userRepository.findOne({
        where: {
          id: userId,
        },
        relations: ['instructor', 'instructor.sams'],
      });
      const sam = user?.instructor?.sams.find(
        (sam) => sam.schoolId === groupWithLesson.lesson.schoolId,
      );
      if (!sam) {
        throw new NotFoundException('sam entity not found');
      }
      if (!sam.editPickPermission) {
        throw new ForbiddenException('You are not allowed to edit student');
      }
    }

    // 모든 studentId 유효성 검증
    const studentIds = [...new Set(dtos.map((dto) => dto.studentId))];
    await this._validateStudents(studentIds);

    // 시간 충돌 검증
    const conflictingStudentNames = await this._validateTimeConflicts(
      dtos,
      groupWithLesson,
    );
    if (conflictingStudentNames.length > 0) {
      throw new UnprocessableEntityException(
        conflictingStudentNames.join(', '),
      );
    }

    let affectedRows = 0;

    for (const dto of dtos) {
      // 기존 Pick이 있는지 확인
      const existingPick = await this.pickRepository.findOne({
        where: {
          groupId: dto.groupId,
          studentId: dto.studentId,
        },
      });

      if (existingPick) {
        // 기존 Pick 업데이트
        await this.pickRepository.update(existingPick.id, {
          ...dto,
          termId: termId,
          startedBy: role,
          end: end,
        });
      } else {
        // 새로운 Pick 생성
        const newPick = this.pickRepository.create({
          ...dto,
          termId: termId,
          startedBy: role,
          end: end,
        });
        await this.pickRepository.save(newPick);
      }
      affectedRows++;
    }

    return affectedRows;
  }

  /**
   * 학생들의 시간 충돌을 검증하는 private 메서드
   * @param dtos 새로 추가하려는 pick DTO 배열
   * @param newGroup 새로 추가하려는 group 정보
   * @returns 충돌하는 학생들의 이름 배열
   */
  private async _validateTimeConflicts(
    dtos: CreatePickDto[],
    newGroup: Group,
  ): Promise<string[]> {
    const conflictingStudentNames: string[] = [];
    const studentIds = [...new Set(dtos.map((dto) => dto.studentId))];

    for (const studentId of studentIds) {
      // 해당 학생의 모든 picks 조회
      const existingPicks = await this.pickRepository.find({
        where: { studentId },
        relations: ['group'],
      });

      // 각 기존 pick과 새로운 group의 시간 충돌 검증
      for (const existingPick of existingPicks) {
        if (
          isTimeConflict(
            existingPick.group.weekday,
            existingPick.group.start,
            existingPick.group.end,
            newGroup.weekday,
            newGroup.start,
            newGroup.end,
          )
        ) {
          // 충돌하는 학생의 이름 조회
          const student = await this.studentRepository.findOne({
            where: { id: studentId },
            select: ['name'],
          });

          if (student && !conflictingStudentNames.includes(student.name)) {
            conflictingStudentNames.push(student.name);
          }
          break; // 한 학생당 하나의 충돌만 체크하면 되므로 break
        }
      }
    }

    return conflictingStudentNames;
  }

  private async _validateStudents(studentIds: number[]): Promise<void> {
    for (const studentId of studentIds) {
      const student = await this.studentRepository.findOne({
        where: { id: studentId },
      });

      if (!student) {
        throw new NotFoundException(`Student with id ${studentId} not found`);
      }
    }
  }

  async endPick(dto: EndPickDto): Promise<Pick> {
    const pick = await this.pickRepository.findOneOrFail({
      where: { groupId: dto.groupId, studentId: dto.studentId },
    });
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

  async endPickRollback(dto: {
    groupId: number;
    studentId: number;
  }): Promise<Pick> {
    const pick = await this.pickRepository.findOneOrFail({
      where: { groupId: dto.groupId, studentId: dto.studentId },
      relations: ['group', 'group.lesson', 'group.lesson.term'],
    });
    if (!pick) {
      throw new NotFoundException('pick entity not found');
    }
    await this.pickRepository.update(pick.id, {
      endedBy: null,
      end: pick.group.lesson.end || pick.group.lesson.term.end,
    });

    return pick;
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

  async update(id: number, dto: UpdatePickDto): Promise<Pick> {
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
