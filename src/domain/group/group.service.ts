import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { formatInTimeZone } from 'date-fns-tz';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { BookingStatus, ClassStatus, StudentStatus } from 'src/common/enums';
import { RemovalStatus } from 'src/common/enums/removal-status';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { Contract } from 'src/domain/contract/entities/contract.entity';
import { BookedStudentDto } from 'src/domain/group/dto/booked-student.dto';
import { CreateGroupDto } from 'src/domain/group/dto/create-group.dto';
import { DeleteGroupDto } from 'src/domain/group/dto/delete-group.dto';
import { PickedStudentDto } from 'src/domain/group/dto/picked-student.dto';
import { UpdateGroupDto } from 'src/domain/group/dto/update-group.dto';
import { Group } from 'src/domain/group/entities/group.entity';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { parseTime, parseTimeFormat } from 'src/helpers/parse';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class GroupService {
  private readonly logger = new Logger(GroupService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Pick)
    private readonly pickRepository: Repository<Pick>,
    @InjectRepository(Offering)
    private readonly offeringRepository: Repository<Offering>,
    private readonly dataSource: DataSource,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateGroupDto): Promise<Group> {
    return await this.dataSource.transaction(async (manager) => {
      // 1. DTO 파싱
      if (dto.start) {
        dto.start = parseTimeFormat(parseTime(dto.start));
      }
      if (dto.end) {
        dto.end = parseTimeFormat(parseTime(dto.end));
      }
      const allowedGradesString: string | undefined = dto.allowedGrades
        ? typeof dto.allowedGrades === 'string'
          ? dto.allowedGrades
          : dto.allowedGrades.join(',')
        : undefined;

      // 2. 필수 검증
      if (!dto.lessonId) {
        throw new NotFoundException('Lesson ID is required');
      }

      if (!dto.instructorId && (!dto.instructorName || !dto.instructorPhone)) {
        throw new UnprocessableEntityException(
          'Either instructorId or both instructorName and instructorPhone must be provided',
        );
      }

      // 3. lesson 조회
      const lesson = await manager.findOne(Lesson, {
        where: { id: dto.lessonId },
        select: ['id', 'schoolId', 'termId', 'start', 'end'],
      });

      if (!lesson) {
        throw new NotFoundException('Lesson not found');
      }

      // 4. instructor와 sam 처리
      let sam: Sam;

      if (dto.instructorId) {
        // 4-1. 기존 instructor 사용
        const instructor = await manager.findOne(Instructor, {
          where: { id: dto.instructorId },
          relations: ['sams'],
        });

        if (!instructor) {
          throw new NotFoundException('Instructor not found');
        }

        // 해당 school의 sam이 있는지 확인
        const existingSam = instructor.sams?.find(
          (s) => s.schoolId === lesson.schoolId,
        );

        if (existingSam) {
          sam = existingSam;
        } else {
          // sam이 없으면 생성
          sam = await manager.save(
            Sam,
            manager.create(Sam, {
              instructorId: dto.instructorId,
              schoolId: lesson.schoolId,
              alias: dto.instructorName || instructor.name,
            }),
          );
        }
      } else {
        // 4-2. 새로운 instructor 생성
        // 전화번호 중복 확인
        const existingInstructor = await manager.findOne(Instructor, {
          where: { phone: dto.instructorPhone },
          select: ['id'],
        });

        if (existingInstructor) {
          throw new UnprocessableEntityException(
            'The phone number is already taken',
          );
        }

        // instructor 생성
        const instructor = await manager.save(
          Instructor,
          manager.create(Instructor, {
            name: dto.instructorName!,
            phone: dto.instructorPhone!,
          }),
        );

        // sam 생성
        sam = await manager.save(
          Sam,
          manager.create(Sam, {
            instructorId: instructor.id,
            schoolId: lesson.schoolId,
            alias: dto.instructorName!,
          }),
        );
      }

      // 5. group 생성
      const groupData = {
        ...dto,
        samId: sam.id,
        samName: dto.instructorName,
        allowedGrades: allowedGradesString,
      };

      const savedGroup = await manager.save(
        Group,
        manager.create(Group, groupData),
      );

      // 6. contract 생성
      await manager.save(
        Contract,
        manager.create(Contract, {
          groupId: savedGroup.id,
          samId: sam.id,
          lessonId: lesson.id,
          termId: lesson.termId,
          start: lesson.start,
          end: lesson.end,
        }),
      );

      return savedGroup;
    });
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
            // withDeleted: true,
          })
        : await this.groupRepository.findOneOrFail({
            where: { id },
            // withDeleted: true,
          });
    } catch (error) {
      this.logger.error(error);
      throw new NotFoundException(error.message);
    }
  }

  async listStudents(
    id: number,
    isActive?: string,
  ): Promise<PickedStudentDto[]> {
    const queryBuilder = this.pickRepository
      .createQueryBuilder('pick')
      .leftJoinAndSelect('pick.group', 'group')
      .leftJoinAndSelect('pick.student', 'student')
      .leftJoinAndSelect('student.parent', 'parent')
      .where('pick.groupId = :groupId', { groupId: id })
      .andWhere('student.status = :status', {
        status: StudentStatus.ATTENDING,
      });

    if (isActive !== undefined) {
      const value = isActive === 'true' || isActive === '1' ? true : false;
      queryBuilder.andWhere('pick.isActive = :isActive', { isActive: value });
    }

    const picks = await queryBuilder.getMany();

    return picks.map(
      (pick: Pick) =>
        new PickedStudentDto({
          id: pick.studentId,
          index: pick.index,
          // groupId: pick.groupId,
          groupName: pick.group.groupName,
          name: pick.student.name,
          grade: pick.student.grade,
          klass: pick.student.klass,
          bunho: pick.student.bunho,
          status: pick.student.status,
          phone: pick.student.phone,
          parentPhone: pick.student.parent.phone,
          nextStops: pick.student.nextStops,
          note: pick.note,
          history: pick.history,
          startedBy: pick.startedBy,
          endedBy: pick.endedBy,
          start: pick.start || null,
          end: pick.end || null,
          isActive: pick.isActive,
        }),
    );
  }

  async listStudentsPaginated(
    id: number,
    query: PaginateQuery,
  ): Promise<Paginated<PickedStudentDto>> {
    const queryBuilder = this.pickRepository
      .createQueryBuilder('pick')
      .leftJoin('pick.student', 'student')
      .where('pick.groupId = :groupId', { groupId: id })
      .andWhere('student.status = :status', {
        status: StudentStatus.ATTENDING,
      });

    const result = await paginate(query, queryBuilder, {
      relations: {
        student: {
          parent: true,
        },
        group: true,
      },
      sortableColumns: ['id'],
      searchableColumns: ['note', 'student.name'],
      defaultSortBy: [
        ['student.grade', 'ASC'],
        ['student.klass', 'ASC'],
        ['student.bunho', 'ASC'],
      ],
      filterableColumns: {
        isActive: [FilterOperator.EQ],
        startedBy: [FilterOperator.EQ],
        endedBy: [FilterOperator.EQ],
        note: [FilterOperator.EQ, FilterOperator.ILIKE],
      },
    });

    // Pick 데이터를 PickedStudentDto로 변환
    const transformedData = result.data.map((pick: Pick) => {
      // 디버깅을 위한 로그
      this.logger.debug(
        `Pick ${pick.id}: start=${pick.start}, end=${pick.end}`,
      );

      return new PickedStudentDto({
        id: pick.studentId,
        index: pick.index,
        // groupId: pick.groupId,
        groupName: pick.group.groupName,
        name: pick.student.name,
        grade: pick.student.grade,
        klass: pick.student.klass,
        bunho: pick.student.bunho,
        status: pick.student.status,
        phone: pick.student.phone,
        parentPhone: pick.student.parent.phone,
        nextStops: pick.student.nextStops,
        note: pick.note,
        startedBy: pick.startedBy,
        endedBy: pick.endedBy,
        start: pick.start || null,
        end: pick.end || null,
        isActive: pick.isActive,
      });
    });

    return {
      data: transformedData,
      meta: result.meta,
    } as Paginated<PickedStudentDto>;
  }

  async listAvailableStudents(id: number): Promise<Student[]> {
    // 1. Group 정보만 가져오기
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: ['lesson'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // 2. allowedGrades 파싱
    const allowedGrades = group.allowedGrades
      .split(',')
      .map((grade) => parseInt(grade.trim()));

    // 3. database 레벨에서 직접 쿼리 (수업 안듣는 모든 학생)
    const availableStudents = await this.dataSource
      .createQueryBuilder(Student, 'student')
      .leftJoinAndSelect('student.parent', 'parent')
      .where('student.schoolId = :schoolId', {
        schoolId: group.lesson.schoolId,
      })
      .andWhere('student.status = :status', { status: StudentStatus.ATTENDING })
      .andWhere('student.grade IN (:...allowedGrades)', { allowedGrades })
      .andWhere(
        'student.id NOT IN (SELECT DISTINCT p.studentId FROM `picks` p LEFT JOIN `groups` g ON p.groupId = g.id WHERE g.id = :groupId AND p.isActive = :isActive)',
        { groupId: id, isActive: true },
      )
      .getMany();

    return availableStudents;
  }

  async listAvailableStudentsPaginated(
    id: number,
    query: PaginateQuery,
  ): Promise<Paginated<Student>> {
    // 1. Group 정보만 가져오기 (필요한 정보만)
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: ['lesson'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // 2. allowedGrades 파싱
    const allowedGrades = group.allowedGrades
      .split(',')
      .map((grade) => parseInt(grade.trim()));

    // 3. nestjs-paginate를 사용한 최적화된 QueryBuilder 구성
    const queryBuilder = this.dataSource
      .createQueryBuilder(Student, 'student')
      .leftJoinAndSelect('student.parent', 'parent')
      .where('student.schoolId = :schoolId', {
        schoolId: group.lesson.schoolId,
      })
      .andWhere('student.status = :status', { status: StudentStatus.ATTENDING })
      .andWhere('student.grade IN (:...allowedGrades)', { allowedGrades })
      .andWhere(
        'student.id NOT IN (SELECT DISTINCT p.studentId FROM `picks` p LEFT JOIN `groups` g ON p.groupId = g.id WHERE g.id = :groupId AND p.isActive = :isActive)',
        { groupId: id, isActive: true },
      );

    // 4. nestjs-paginate로 페이지네이션 적용
    return await paginate(query, queryBuilder, {
      relations: {
        parent: true,
      },
      sortableColumns: ['id', 'name', 'grade', 'createdAt'],
      searchableColumns: ['name', 'phone'],
      defaultSortBy: [
        ['grade', 'ASC'],
        ['klass', 'ASC'],
        ['bunho', 'ASC'],
      ],
      filterableColumns: {
        name: [FilterOperator.EQ, FilterOperator.ILIKE],
        grade: [FilterOperator.EQ],
        status: [FilterOperator.EQ],
      },
    });
  }

  async listBookedStudents(
    id: number,
    isPending?: string,
  ): Promise<BookedStudentDto[]> {
    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.student', 'student')
      .leftJoinAndSelect('student.parent', 'parent')
      .leftJoin('booking.offering', 'offering')
      .leftJoinAndSelect('offering.groups', 'groups')
      .where('groups.id IN (:...ids)', { ids: [id] })
      .orderBy('booking.status', 'ASC')
      .addOrderBy('booking.waitingPosition', 'ASC')
      .getMany();

    if (
      isPending !== undefined &&
      (isPending === 'true' || isPending === '1')
    ) {
      return bookings
        .filter((booking) => booking.status === BookingStatus.PENDING)
        .map((booking) => {
          return new BookedStudentDto({
            id: booking.id,
            studentId: booking.student.id,
            name: booking.student.name,
            grade: booking.student.grade,
            klass: booking.student.klass,
            bunho: booking.student.bunho,
            parentPhone: booking.student.parent.phone,
            status: booking.student.status,
            waitingPosition: booking.waitingPosition,
            bookingStatus: booking.status,
            createdAt: booking.createdAt,
          });
        });
    }

    // BookedStudentDto 로 변환
    return bookings.map((booking) => {
      return new BookedStudentDto({
        id: booking.id,
        studentId: booking.student.id,
        name: booking.student.name,
        grade: booking.student.grade,
        klass: booking.student.klass,
        bunho: booking.student.bunho,
        parentPhone: booking.student.parent.phone,
        status: booking.student.status,
        waitingPosition: booking.waitingPosition,
        bookingStatus: booking.status,
        createdAt: booking.createdAt,
      });
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateGroupDto): Promise<Group> {
    if (dto.start) {
      dto.start = parseTimeFormat(parseTime(dto.start));
    }
    if (dto.end) {
      dto.end = parseTimeFormat(parseTime(dto.end));
    }
    const allowedGradesString: string | undefined = dto.allowedGrades
      ? typeof dto.allowedGrades === 'string'
        ? dto.allowedGrades
        : dto.allowedGrades.join(',')
      : undefined;
    const group = await this.groupRepository.preload({
      id,
      ...dto,
      allowedGrades: allowedGradesString,
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    return await this.groupRepository.save(group);
  }

  async restore(id: number): Promise<Group> {
    const group = await this.findById(id, ['picks', 'lesson']);
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    if (group.status === ClassStatus.CANCELED) {
      await this.groupRepository.update(id, {
        status: ClassStatus.ACTIVE,
        deletedBy: null,
        note: null,
      });
    } else {
      throw new UnprocessableEntityException('Group status is not canceled');
    }

    // 복구시 취소했던 사람을 다시 수강자로 변경할 필요없어서 주석처리
    // if (group.picks?.length > 0) {
    //   await this.pickRepository.update(
    //     group.picks.map((pick) => pick.id),
    //     {
    //       end: group.lesson.end,
    //       endedBy: null,
    //       note: null,
    //     },
    //   );
    // }

    return await this.findById(id, ['picks', 'lesson']);
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  async removeWithDto(id: number, dto: DeleteGroupDto): Promise<RemovalStatus> {
    const group = await this.findById(id);

    // 폐강 처리 (canceled)
    if (
      group.status === ClassStatus.ACTIVE ||
      group.status === ClassStatus.PENDING
    ) {
      await this.groupRepository.update(id, {
        status: ClassStatus.CANCELED, // no more attendance auto generation
        deletedBy: dto.role,
        note: dto.note,
      });

      if (group.picks?.length > 0) {
        // set picks end date to today (Seoul timezone)
        const today = formatInTimeZone(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
        await this.pickRepository.update(
          group.picks.map((pick) => pick.id),
          {
            end: today,
            endedBy: dto.role,
            note: dto.note,
          },
        );
      }

      return RemovalStatus.CANCELED;
    }

    //! 이미 폐강 (canceled) 상태이면서, picks 가 존재하는 경우,
    //! 폐강전까지의 정보가 picks 에 기록되어 있으므로, 삭제에 유의
    throw new UnprocessableEntityException(
      `already canceled by ${group.deletedBy}`,
    );
  }
}
