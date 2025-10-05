import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { BookingStatus, ClassStatus } from 'src/common/enums';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { BookedStudentDto } from 'src/domain/group/dto/booked-student.dto';
import { PickedStudentDto } from 'src/domain/group/dto/picked-student.dto';
import { CreateLessonDto } from 'src/domain/lesson/dto/create-lesson.dto';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { Repository } from 'typeorm';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { LessonCoreService } from './lesson-core.service';

@Injectable()
export class LessonService {
  private readonly logger = new Logger(LessonService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
    @InjectRepository(Term)
    private readonly termRepository: Repository<Term>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    private readonly lessonCoreService: LessonCoreService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateLessonDto): Promise<Lesson> {
    const school = await this.schoolRepository.findOne({
      where: { id: dto.schoolId },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const term = await this.termRepository.findOne({
      where: { id: dto.termId },
    });
    if (!term) {
      throw new NotFoundException('Term not found');
    }

    return await this.lessonCoreService.create(school, term, dto);
  }

  //! create() 의 모든 로직이 무사히 실행되는지 persist 하지 않고, 실험해보기 위한 것이
  //! dryrun() 인데, 그냥 중복 강좌 레코드가 있는지만 확인하고 말았다. ㅠ.ㅠ
  async dryRun(dto: CreateLessonDto): Promise<Lesson | null> {
    // In dryRun mode, we check if the lesson exists but don't create it
    const existingLesson = await this.lessonRepository.findOne({
      where: {
        termId: dto.termId,
        schoolId: dto.schoolId,
        lessonName: dto.lessonName,
      },
    });

    return existingLesson ? existingLesson : null;
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  async findAll(query: PaginateQuery): Promise<Paginated<Lesson>> {
    return await paginate(query, this.lessonRepository, {
      sortableColumns: ['createdAt'],
      nullSort: 'last',
      defaultSortBy: [['id', 'DESC']],
      searchableColumns: ['description'],
      filterableColumns: {
        instructorId: [FilterOperator.EQ],
      },
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? FIND
  //? ---------------------------------------------------------------------- ?//

  async findById(id: number, relations: string[] = []): Promise<Lesson> {
    try {
      return relations.length > 0
        ? await this.lessonRepository.findOneOrFail({
            where: { id },
            relations,
          })
        : await this.lessonRepository.findOneOrFail({
            where: { id },
          });
    } catch (error) {
      this.logger.error(error);
      throw new NotFoundException(error.message);
    }
  }

  async listPickedStudents(lessonId: number): Promise<PickedStudentDto[]> {
    const students = await this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.parent', 'parent')
      .leftJoinAndSelect('student.picks', 'pick')
      .leftJoinAndSelect('pick.group', 'group')
      .leftJoin('group.lesson', 'lesson')
      .where('lesson.id = :lessonId', { lessonId })
      .orderBy('student.id', 'ASC')
      .addOrderBy('student.grade', 'ASC')
      .addOrderBy('student.class', 'ASC')
      .addOrderBy('student.studentCode', 'ASC')
      .getMany();

    //! edge case 대응. 혹시 모를 중복 학생 제거 (동일한 student.id를 가진 경우)
    const uniqueStudents = students.filter(
      (student, index, self) =>
        index === self.findIndex((v) => v.id === student.id),
    );

    // Student 데이터를 PickedStudentDto 변환
    const data: PickedStudentDto[] = uniqueStudents.map((student) => {
      const groupName =
        student.picks && student.picks.length > 1
          ? `${student.picks[0].group.groupName} 외 ${student.picks.length - 1}개`
          : student.picks?.[0]?.group?.groupName || '';
      // picks 속성을 제외한 student 객체 생성
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { picks: _picks, ...studentWithoutPicks } = student;

      // PickedStudentDto 클래스 인스턴스 생성
      return new PickedStudentDto({
        ...studentWithoutPicks,
        groupName,
        parentPhone: student.parent.phone,
        start: student.picks?.[0].start || null,
        startedBy: student.picks?.[0].startedBy || null,
        end: student.picks?.[0].end || null,
        endedBy: student.picks?.[0].endedBy || null,
        isActive: student.picks?.[0].isActive || false,
      });
    });

    return data;
  }

  async listPickedStudentsPaginated(
    lessonId: number,
    query?: PaginateQuery,
  ): Promise<Paginated<PickedStudentDto>> {
    const queryBuilder = this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.parent', 'parent')
      .leftJoinAndSelect('student.picks', 'pick')
      .leftJoinAndSelect('pick.group', 'group')
      .leftJoin('group.lesson', 'lesson')
      .where('lesson.id = :lessonId', { lessonId });

    const result = await paginate(
      query || { page: 1, limit: 20, path: '' },
      queryBuilder,
      {
        sortableColumns: ['id', 'name', 'grade', 'class', 'studentCode'],
        searchableColumns: ['name'],
        defaultSortBy: [
          ['id', 'ASC'],
          ['grade', 'ASC'],
          ['class', 'ASC'],
          ['studentCode', 'ASC'],
        ],
        filterableColumns: {
          grade: [FilterOperator.EQ],
          class: [FilterOperator.EQ, FilterOperator.ILIKE],
          status: [FilterOperator.EQ],
        },
      },
    );

    //! edge case 대응. 혹시 모를 중복 학생 제거 (동일한 student.id를 가진 경우)
    const uniqueStudents = result.data.filter(
      (student, index, self) =>
        index === self.findIndex((v) => v.id === student.id),
    );

    // Student 데이터를 PickedStudentDto 변환
    const data: PickedStudentDto[] = uniqueStudents.map((student) => {
      const groupName =
        student.picks && student.picks.length > 1
          ? `${student.picks[0].group.groupName} 외 ${student.picks.length - 1}개`
          : student.picks?.[0]?.group?.groupName || '';
      // picks 속성을 제외한 student 객체 생성
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { picks: _picks, ...studentWithoutPicks } = student;

      // PickedStudentDto 클래스 인스턴스 생성
      return new PickedStudentDto({
        ...studentWithoutPicks,
        groupName,
        parentPhone: student.parent.phone,
        start: student.picks?.[0].start || null,
        startedBy: student.picks?.[0].startedBy || null,
        end: student.picks?.[0].end || null,
        endedBy: student.picks?.[0].endedBy || null,
      });
    });

    return {
      ...result,
      data: data,
    } as Paginated<PickedStudentDto>;
  }

  async listBookedStudents(
    id: number,
    isPending?: string,
  ): Promise<BookedStudentDto[]> {
    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.student', 'student')
      .leftJoin('student.parent', 'parent')
      .leftJoin('booking.offering', 'offering')
      .leftJoinAndSelect('offering.groups', 'groups')
      .leftJoin('groups.lesson', 'lesson')
      .where('lesson.id = :id', { id })
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
            class: booking.student.class,
            studentCode: booking.student.studentCode,
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
        class: booking.student.class,
        studentCode: booking.student.studentCode,
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

  async update(id: number, dto: UpdateLessonDto): Promise<Lesson> {
    return await this.lessonCoreService.update(id, dto);
  }

  async updateDays(id: number): Promise<number> {
    // LessonCoreService의 통합 메서드를 사용하여 schooldays 동기화
    await this.lessonCoreService.syncSchooldaysForLessonById(id);

    // 업데이트된 lesson을 다시 조회하여 총 일수 계산
    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['groups'],
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    const totalDays = lesson.groups.reduce((sum, group) => sum + group.days, 0);
    return totalDays;
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  async remove(id: number): Promise<Lesson> {
    const lesson = await this.lessonRepository.preload({
      id,
      ...{
        status: ClassStatus.CANCELED,
        deletedAt: new Date(),
      },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson not found`);
    }

    return await this.lessonRepository.save(lesson);
  }
}
