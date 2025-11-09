import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { BookingStatus, ClassStatus } from 'src/common/enums';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { SyncCurriculumDto } from 'src/domain/curriculum/dto/sync-curriculum.dto';
import { Curriculum } from 'src/domain/curriculum/entities/curriculum.entity';
import { BookedStudentDto } from 'src/domain/group/dto/booked-student.dto';
import { PickedStudentDto } from 'src/domain/group/dto/picked-student.dto';
import { CreateLessonDto } from 'src/domain/lesson/dto/create-lesson.dto';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { Syllabus } from 'src/domain/syllabus/entities/syllabus.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { In, Repository } from 'typeorm';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { LessonCoreService } from './lesson-core.service';

@Injectable()
export class LessonService {
  private readonly logger = new Logger(LessonService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Curriculum)
    private readonly curriculumRepository: Repository<Curriculum>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
    @InjectRepository(Syllabus)
    private readonly syllabusRepository: Repository<Syllabus>,
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
    let syllabus: Syllabus | null = null;
    if (dto.syllabusSlug) {
      syllabus = await this.syllabusRepository.findOne({
        where: { slug: dto.syllabusSlug },
      });
      if (!syllabus) {
        throw new NotFoundException('Syllabus not found');
      }
    }

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

    const lesson = await this.lessonCoreService.create(school, term, dto);

    if (dto.syllabusSlug && syllabus) {
      const curriculum = this.curriculumRepository.create({
        lessonId: lesson.id,
        syllabusId: syllabus.id,
      });
      await this.curriculumRepository.save(curriculum);
    }

    return lesson;
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

  async findById(id: number, relations: string[] = []): Promise<Lesson> {
    try {
      // groups.picks를 포함할 때 isActive = true 조건 추가
      const includesPicks = relations.includes('groups.picks');

      if (includesPicks) {
        // QueryBuilder를 사용하여 picks에 조건 추가
        const queryBuilder = this.lessonRepository
          .createQueryBuilder('lesson')
          .where('lesson.id = :id', { id })
          .leftJoinAndSelect('lesson.groups', 'groups');

        // 나머지 relations 추가
        if (relations.includes('groups.sam')) {
          queryBuilder.leftJoinAndSelect('groups.sam', 'sam');
        }
        if (relations.includes('groups.sam.instructor')) {
          queryBuilder.leftJoinAndSelect('sam.instructor', 'instructor');
        }
        if (relations.includes('category')) {
          queryBuilder.leftJoinAndSelect('lesson.category', 'category');
        }
        if (relations.includes('curriculums')) {
          queryBuilder.leftJoinAndSelect('lesson.curriculums', 'curriculums');
        }

        // picks는 isActive = true 조건과 함께 조인
        queryBuilder.leftJoinAndSelect(
          'groups.picks',
          'picks',
          'picks.isActive = :isActive',
          { isActive: true },
        );

        const lesson = await queryBuilder.getOneOrFail();

        // picks 배열 필터링 (안전을 위해 이중 필터링)
        if (lesson.groups) {
          lesson.groups.forEach((group) => {
            if (group.picks) {
              group.picks = group.picks.filter(
                (pick) => pick.isActive === true,
              );
            }
          });
        }

        return lesson;
      }

      // picks를 포함하지 않는 경우 기존 로직 사용
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
      .addOrderBy('pick.groupId', 'ASC')
      .addOrderBy('student.grade', 'ASC')
      .addOrderBy('student.klass', 'ASC')
      .addOrderBy('student.bunho', 'ASC')
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
          ? `${student.picks.map((pick) => pick.group.groupName).join(',')}`
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
        sortableColumns: ['id', 'name', 'grade', 'klass', 'bunho'],
        searchableColumns: ['name'],
        defaultSortBy: [
          ['id', 'ASC'],
          ['grade', 'ASC'],
          ['klass', 'ASC'],
          ['bunho', 'ASC'],
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
      .leftJoinAndSelect('student.parent', 'parent')
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

  async syncCurriculums(
    lessonId: number,
    dtos: SyncCurriculumDto[],
  ): Promise<void> {
    await this.lessonRepository.findOneOrFail({ where: { id: lessonId } });

    const syllabusIds = dtos.map((item) => item.syllabusId);
    const uniqueCount = new Set(syllabusIds).size;
    if (uniqueCount !== syllabusIds.length) {
      throw new BadRequestException('syllabusId 항목이 중복되었습니다');
    }

    if (uniqueCount > 0) {
      const foundCount = await this.syllabusRepository.count({
        where: { id: In(syllabusIds) },
      });
      if (foundCount !== uniqueCount) {
        throw new NotFoundException(
          '존재하지 않는 syllabusId가 포함되어 있습니다',
        );
      }
    }

    await this.curriculumRepository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(Curriculum);
      await repo.delete({ lessonId });

      if (dtos.length === 0) {
        return;
      }

      const entities = dtos.map((item) =>
        repo.create({
          lessonId,
          syllabusId: item.syllabusId,
          termId: item.termId,
          schoolId: item.schoolId,
        }),
      );

      await repo.insert(entities);
    });
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
