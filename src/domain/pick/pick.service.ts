import {
  BadRequestException,
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
import { Actor, BookingStatus, ClassStatus } from 'src/common/enums';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import {
  CreatePickDto,
  EndPickDto,
  StartPickDto,
} from 'src/domain/pick/dto/create-pick.dto';
import { UpdatePickDto } from 'src/domain/pick/dto/update-pick.dto';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { User } from 'src/domain/user/entities/user.entity';
import { isTimeConflict } from 'src/helpers/parse';
import { DataSource, In, Repository } from 'typeorm';

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
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly dataSource: DataSource,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  // 수동등록 (중간전입)
  // 필수항목) groupId, studentId, offeringId, termId, start
  async startPick(
    dtos: StartPickDto[],
    role: Actor,
    userId: number,
  ): Promise<number> {
    if (dtos.length === 0) {
      throw new BadRequestException('dtos is empty');
    }

    const groupId = dtos[0].groupId;
    const groupWithLesson = await this.groupRepository.findOneOrFail({
      where: {
        id: groupId,
      },
      relations: ['lesson', 'lesson.term'],
    });
    const end = groupWithLesson.lesson.end || groupWithLesson.lesson.term.end;
    const termId = dtos[0].termId || groupWithLesson.lesson.termId;

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
      termId,
    );
    if (conflictingStudentNames.length > 0) {
      throw new UnprocessableEntityException(
        `이 학생들은 타 수업과 충돌로 수강불가: ${conflictingStudentNames.join(', ')}`,
      );
    }

    let affectedRows = 0;

    for (const dto of dtos) {
      // 기존 Pick이 있는지 확인
      const existingPick = await this.pickRepository.findOne({
        where: {
          groupId: dto.groupId,
          studentId: dto.studentId,
          termId: termId,
        },
      });

      if (existingPick) {
        // 기존 Pick 업데이트 - joinPick 패턴 적용
        await this.pickRepository
          .createQueryBuilder()
          .update(Pick)
          .set({
            ...dto,
            offeringId: groupWithLesson.offeringId!,
            isActive: true,
            termId: termId,
            startedBy: role,
            end: end,
            history: () => `JSON_ARRAY_APPEND(
              COALESCE(history, JSON_ARRAY()),
              '$',
              JSON_OBJECT(
                'event', 'JOIN',
                'by', '${role}',
                'date', '${new Date().toISOString().slice(0, 10)}'
              )
            )`,
          })
          .where('id = :id', { id: existingPick.id })
          .execute();
      } else {
        // 새로운 Pick 생성 (default isActive is true)
        const newPick = this.pickRepository.create({
          ...dto,
          termId: termId,
          startedBy: role ?? Actor.OTHER,
          end: end,
          history: [
            {
              event: 'JOIN' as const,
              by: role,
              date: new Date().toISOString().slice(0, 10),
            },
          ],
        });
        await this.pickRepository.save(newPick);
      }

      // booking 상태를 ENROLLED로 업데이트
      if (groupWithLesson.offeringId) {
        await this._updateBookingStatus(
          groupWithLesson.offeringId,
          dto.studentId,
          BookingStatus.ENROLLED,
        );
      }

      affectedRows++;
    }

    // 그룹을 활성화 상태로 업데이트
    await this.groupRepository.update(groupId, { status: ClassStatus.ACTIVE });

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
    termId: number,
  ): Promise<string[]> {
    const conflictingStudentNames: string[] = [];
    const studentIds = [...new Set(dtos.map((dto) => dto.studentId))];

    // 모든 학생의 이름을 미리 조회 (N+1 쿼리 방지)
    const students = await this.studentRepository.find({
      where: { id: In(studentIds) },
      select: ['id', 'name'],
    });
    const studentNameMap = new Map(
      students.map((student) => [student.id, student.name]),
    );

    for (const studentId of studentIds) {
      // 해당 학생의 모든 picks 조회 (lesson 정보를 포함하여 포함)
      const existingPicks = await this.pickRepository.find({
        where: { studentId, termId, isActive: true },
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
          // 미리 조회한 학생 이름과 충돌하는 과목명 조합
          const studentName = studentNameMap.get(studentId);
          if (studentName) {
            const groupName = existingPick.group.groupName || '반이름없음';
            const conflictInfo = `${studentName}:${groupName}`;
            if (!conflictingStudentNames.includes(conflictInfo)) {
              conflictingStudentNames.push(conflictInfo);
            }
          }
          break; // 한 학생당 하나의 충돌만 체크하면 되므로 break
        }
      }
    }

    return conflictingStudentNames;
  }

  private async _validateStudents(studentIds: number[]): Promise<void> {
    const students = await this.studentRepository.find({
      where: { id: In(studentIds) },
      select: ['id'],
    });

    const foundStudentIds = students.map((student) => student.id);
    const missingStudentIds = studentIds.filter(
      (id) => !foundStudentIds.includes(id),
    );

    if (missingStudentIds.length > 0) {
      throw new NotFoundException(
        `Students with ids ${missingStudentIds.join(', ')} not found`,
      );
    }
  }

  /**
   * booking 상태를 업데이트하는 private 메서드
   * @param offeringId offering ID
   * @param studentId student ID
   * @param status 업데이트할 상태
   */
  private async _updateBookingStatus(
    offeringId: number,
    studentId: number,
    status: BookingStatus,
  ): Promise<void> {
    await this.bookingRepository
      .createQueryBuilder()
      .update(Booking)
      .set({ waitingPosition: 0, status: status })
      .where('offeringId = :offeringId', { offeringId })
      .andWhere('studentId = :studentId', { studentId })
      .execute();
  }

  // 수동등록 (중간전입)
  // 필수항목) groupId, studentId, offeringId, termId, start, note(optional)
  async endPick(dto: EndPickDto): Promise<Pick> {
    const pick = await this.pickRepository.findOneOrFail({
      where: { groupId: dto.groupId, studentId: dto.studentId },
    });
    if (!pick) {
      throw new NotFoundException('pick entity not found');
    }

    // transaction으로 묶기
    await this.dataSource.transaction(async (manager) => {
      // pick 업데이트
      await manager
        .createQueryBuilder()
        .update(Pick)
        .set({
          isActive: false,
          endedBy: dto.endedBy ?? Actor.OTHER,
          end: dto.end,
          note: dto.note ?? null,
          history: () => `JSON_ARRAY_APPEND(
            COALESCE(history, JSON_ARRAY()),
            '$',
            JSON_OBJECT(
              'event', 'CANCEL',
              'by', '${dto.endedBy}',
              'date', '${new Date().toISOString().slice(0, 10)}'
            )
          )`,
        })
        .where('id = :id', { id: pick.id })
        .execute();

      // booking 상태를 CANCELED로 업데이트
      if (pick.offeringId) {
        await manager
          .createQueryBuilder()
          .update(Booking)
          .set({ waitingPosition: 0, status: BookingStatus.CANCELED })
          .where('offeringId = :offeringId', { offeringId: pick.offeringId })
          .andWhere('studentId = :studentId', { studentId: pick.studentId })
          .execute();
      }
    });

    pick.isActive = false;
    pick.endedBy = dto.endedBy ?? Actor.OTHER;
    pick.end = dto.end;
    pick.note = dto.note ?? null;

    return pick;
  }

  //! client 에서 이를 사용하지 않는 것 같다.
  //! groupId, studentId, offeringId, termId, start
  async restartPick(dto: StartPickDto): Promise<Pick> {
    const pick = await this.pickRepository.findOneOrFail({
      where: { groupId: dto.groupId, studentId: dto.studentId },
      relations: ['group', 'group.lesson', 'group.lesson.term'],
    });
    if (!pick) {
      throw new NotFoundException('pick entity not found');
    }

    await this.pickRepository
      .createQueryBuilder()
      .update(Pick)
      .set({
        isActive: true,
        startedBy: dto.startedBy ?? Actor.OTHER,
        start: dto.start,
        endedBy: null,
        end: pick.group.lesson.end || pick.group.lesson.term.end,
        note: dto.note ?? null,
        history: () => `JSON_ARRAY_APPEND(
          COALESCE(history, JSON_ARRAY()),
          '$',
          JSON_OBJECT(
            'event', 'JOIN',
            'by', '${dto.startedBy}',
            'date', '${new Date().toISOString().slice(0, 10)}'
          )
        )`,
      })
      .where('id = :id', { id: pick.id })
      .execute();

    // booking 상태를 ENROLLED로 업데이트
    if (pick.offeringId) {
      await this._updateBookingStatus(
        pick.offeringId,
        pick.studentId,
        BookingStatus.ENROLLED,
      );
    }

    pick.isActive = true;
    pick.startedBy = dto.startedBy;
    pick.start = dto.start;
    pick.endedBy = null;
    pick.end = pick.group.lesson.end || pick.group.lesson.term.end;
    pick.note = dto.note ?? null;

    return pick;
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

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

  //? termId로 학생 목록 조회 (studentId 중복 제거)
  async listStudentsByTerm(termId: number): Promise<Pick[]> {
    return await this.pickRepository
      .createQueryBuilder('pick')
      .leftJoinAndSelect('pick.student', 'student')
      .leftJoinAndSelect('student.parent', 'parent')
      .leftJoinAndSelect('pick.group', 'group')
      .leftJoinAndSelect('group.lesson', 'lesson')
      .where('lesson.termId = :termId', { termId })
      .andWhere('pick.deletedAt IS NULL')
      .groupBy(
        'pick.studentId, pick.id, student.id, parent.id, group.id, lesson.id',
      )
      .orderBy('student.name', 'ASC')
      .getMany();
  }

  //? termId로 학생 목록 조회 (페이지네이션, studentId 중복 제거)
  async listStudentsByTermPaginated(
    termId: number,
    query: PaginateQuery,
  ): Promise<Paginated<Pick>> {
    const queryBuilder = this.pickRepository
      .createQueryBuilder('pick')
      .leftJoinAndSelect('pick.student', 'student')
      .leftJoinAndSelect('student.parent', 'parent')
      .leftJoinAndSelect('pick.group', 'group')
      .leftJoinAndSelect('group.lesson', 'lesson')
      .where('lesson.termId = :termId', { termId })
      .andWhere('pick.deletedAt IS NULL')
      .groupBy(
        'pick.studentId, pick.id, student.id, parent.id, group.id, lesson.id',
      );

    return await paginate(query, queryBuilder, {
      relations: {
        student: {
          parent: true,
        },
        group: {
          lesson: true,
        },
      },
      sortableColumns: ['id', 'student.name'],
      searchableColumns: ['student.name', 'student.phone', 'note'],
      defaultSortBy: [['student.name', 'ASC']] as any,
      filterableColumns: {
        'student.schoolId': [FilterOperator.EQ],
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
