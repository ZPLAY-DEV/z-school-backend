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
import { BookingStatus, ClassStatus } from 'src/common/enums';
import { RemovalStatus } from 'src/common/enums/removal-status';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { Contract } from 'src/domain/contract/entities/contract.entity';
import { BookedStudentDto } from 'src/domain/group/dto/booked-student.dto';
import { CreateGroupDto } from 'src/domain/group/dto/create-group.dto';
import { DeleteGroupDto } from 'src/domain/group/dto/delete-group.dto';
import { UpdateGroupDto } from 'src/domain/group/dto/update-group.dto';
import { Group } from 'src/domain/group/entities/group.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import {
  parseRangeFormat,
  parseTime,
  parseTimeFormat,
} from 'src/helpers/parse';
import { Repository } from 'typeorm';

@Injectable()
export class GroupService {
  private readonly logger = new Logger(GroupService.name);

  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Pick)
    private readonly pickRepository: Repository<Pick>,
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    @InjectRepository(Schoolday)
    private readonly schooldayRepository: Repository<Schoolday>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Offering)
    private readonly offeringRepository: Repository<Offering>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateGroupDto): Promise<Group> {
    if (dto.start) {
      dto.start = parseTimeFormat(parseTime(dto.start));
    }
    if (dto.end) {
      dto.end = parseTimeFormat(parseTime(dto.end));
    }
    if (dto.allowedGrades) {
      dto.allowedGrades = parseRangeFormat(dto.allowedGrades).join(',');
    }
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

  async listAvailableStudents(id: number): Promise<Student[]> {
    // 1. Group을 찾고 lesson과 lesson.groups, lesson.school 관계를 포함하여 가져오기
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: [
        'lesson',
        'lesson.groups',
        'lesson.groups.picks',
        'lesson.school',
        'lesson.school.students',
      ],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // 2. allowedGrades 파싱 (쉼표로 구분된 문자열을 숫자 배열로 변환)
    const allowedGrades = group.allowedGrades
      .split(',')
      .map((grade) => parseInt(grade.trim()));

    // 3. lesson의 모든 groups의 picks에서 studentId 추출
    const excludedStudentIds = new Set<number>();
    group.lesson.groups.forEach((lessonGroup) => {
      lessonGroup.picks?.forEach((pick) => {
        if (pick.studentId) {
          excludedStudentIds.add(pick.studentId);
        }
      });
    });

    // 4. school의 students 중에서 조건에 맞는 학생들 필터링
    const availableStudents = group.lesson.school.students.filter((student) => {
      // grade가 allowedGrades에 포함되어야 함
      const gradeMatches = allowedGrades.includes(student.grade);

      // picks에 포함되지 않아야 함
      const notInPicks = !excludedStudentIds.has(student.id);

      return gradeMatches && notInPicks;
    });

    return availableStudents;
  }

  async listBookedPendingStudents(id: number): Promise<BookedStudentDto[]> {
    // 1. Group을 찾고 lesson 관계를 포함하여 가져오기
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: ['lesson'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // 2. Group의 allowedGrades 파싱 (쉼표로 구분된 문자열을 숫자 배열로 변환)
    const groupAllowedGrades = group.allowedGrades
      .split(',')
      .map((grade) => parseInt(grade.trim()));

    // 3. 해당 lesson에 속하면서 allowedGrades가 동일한 모든 offerings 찾기
    const offerings = await this.offeringRepository
      .createQueryBuilder('offering')
      .where('offering.lessonId = :lessonId', { lessonId: group.lessonId })
      .getMany();

    // allowedGrades가 정확히 같은 offerings만 필터링
    const matchingOfferings = offerings.filter((offering) => {
      const offeringGrades = offering.allowedGrades.sort();
      const groupGrades = groupAllowedGrades.sort();

      return (
        offeringGrades.length === groupGrades.length &&
        offeringGrades.every((grade, index) => grade === groupGrades[index])
      );
    });

    if (matchingOfferings.length === 0) {
      return [];
    }

    const offeringIds = matchingOfferings.map((offering) => offering.id);

    // 4. 해당 offerings에 대한 PENDING 상태의 bookings를 waitingPosition 순으로 조회
    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.student', 'student')
      .leftJoinAndSelect('booking.offering', 'offering')
      .where('booking.offeringId IN (:...offeringIds)', { offeringIds })
      .andWhere('booking.status = :status', { status: BookingStatus.PENDING })
      .orderBy('booking.waitingPosition', 'ASC')
      .getMany();

    // 5. BookedStudentDto 생성하여 반환
    const bookedStudents: BookedStudentDto[] = bookings.map((booking) => {
      return new BookedStudentDto({
        ...booking.student,
        waitingPosition: booking.waitingPosition,
        bookingStatus: booking.status,
      });
    });

    return bookedStudents;
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
    if (dto.allowedGrades) {
      dto.allowedGrades = parseRangeFormat(dto.allowedGrades).join(',');
    }
    const group = await this.groupRepository.preload({
      id,
      ...dto,
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
        note: 'restored',
      });
    } else {
      throw new UnprocessableEntityException('Group status is not canceled');
    }
    if (group.picks?.length > 0) {
      await this.pickRepository.update(
        group.picks.map((pick) => pick.id),
        {
          end: group.lesson.end, // 복구 시 종료일 초기화
          endedBy: null, // 복구 시 종료자 정보 초기화
          note: null, //! note needs to be null
        },
      );
    }

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
