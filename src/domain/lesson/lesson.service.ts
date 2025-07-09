import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { CalendarService } from 'src/domain/calendar/calendar.service';
import { Group } from 'src/domain/group/entities/group.entity';
import { CreateLessonDto } from 'src/domain/lesson/dto/create-lesson.dto';
import { ExtendedStudent } from 'src/domain/lesson/dto/extended-student.dto';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { generateSchooldays } from 'src/helpers/lesson-days.util';
import { Repository } from 'typeorm';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { LessonCoreService } from './lesson-core.service';

@Injectable()
export class LessonService {
  private readonly logger = new Logger(LessonService.name);

  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Schoolday)
    private readonly schooldayRepository: Repository<Schoolday>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    private readonly lessonCoreService: LessonCoreService,
    private readonly calendarService: CalendarService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateLessonDto): Promise<Lesson> {
    return await this.lessonCoreService.create(dto);
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

  async findStudentsById(
    id: number,
    query?: PaginateQuery,
  ): Promise<Paginated<ExtendedStudent>> {
    const queryBuilder = this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.parent', 'parent')
      .leftJoinAndSelect('student.picks', 'pick')
      .leftJoinAndSelect('pick.group', 'group')
      .leftJoin('group.lesson', 'lesson')
      .where('lesson.id = :lessonId', { lessonId: id }); // 중복 학생 제거는 후처리에서 수행

    const result = await paginate(
      query || { page: 1, limit: 20, path: '' },
      queryBuilder,
      {
        sortableColumns: ['id', 'name', 'grade', 'class', 'studentCode'],
        searchableColumns: ['name'],
        defaultSortBy: [
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

    // 중복 학생 제거 (동일한 student.id를 가진 경우)
    const uniqueStudents = result.data.filter(
      (student, index, self) =>
        index === self.findIndex((s) => s.id === student.id),
    );

    // Student 데이터를 ExtendedStudent로 변환
    const extendedStudents: ExtendedStudent[] = uniqueStudents.map(
      (student) => {
        // lesson id로 이미 필터링되었으므로, 첫 번째 pick을 사용
        const groupName =
          student.picks && student.picks.length > 1
            ? `${student.picks[0].group.groupName} 외 ${student.picks.length - 1}개`
            : student.picks?.[0]?.group?.groupName || '';
        const groupStart = student.picks?.[0].start || '';
        const groupStartedBy = student.picks?.[0].startedBy || null;
        // picks 속성을 제외한 student 객체 생성
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { picks: _picks, ...studentWithoutPicks } = student;

        return {
          ...studentWithoutPicks,
          groupName,
          groupStart,
          groupStartedBy,
        };
      },
    );

    return {
      ...result,
      data: extendedStudents,
    } as Paginated<ExtendedStudent>;
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateLessonDto): Promise<Lesson> {
    return await this.lessonCoreService.update(id, dto);
  }

  async updateDays(id: number): Promise<number> {
    let totalDays = 0;

    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['groups', 'groups.schooldays'],
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    if (lesson.start && lesson.end) {
      const offdays: string[] = await this.calendarService.findByDateRange(
        lesson.schoolId,
        lesson.start,
        lesson.end,
      );

      for (const group of lesson.groups) {
        // 1. 기존 schooldays를 key-value로 변환 (startsAt+endsAt 기준)
        const existingMap = new Map<string, Schoolday>();
        for (const sd of group.schooldays) {
          const key = `${sd.startsAt.toISOString()}|${sd.endsAt.toISOString()}`;
          existingMap.set(key, sd);
        }

        // 2. 새로 생성될 schooldays
        const newSchooldays: Schoolday[] = generateSchooldays(
          lesson,
          group,
          offdays,
        );
        const newMap = new Map<string, Schoolday>();
        for (const sd of newSchooldays) {
          const key = `${sd.startsAt.toISOString()}|${sd.endsAt.toISOString()}`;
          newMap.set(key, sd);
        }

        // 3. 추가해야 할 schooldays (new에만 있는 것)
        const toInsert = Array.from(newMap.entries())
          .filter(([key]) => !existingMap.has(key))
          .map(([, sd]) => sd);

        // 4. 삭제해야 할 schooldays (existing에만 있는 것)
        const toDelete = Array.from(existingMap.entries())
          .filter(([key]) => !newMap.has(key))
          .map(([, sd]) => sd);

        // 5. 실제 DB 반영 (update는 불필요하므로 생략)
        if (toDelete.length > 0) {
          await this.schooldayRepository.delete(toDelete.map((sd) => sd.id));
        }
        if (toInsert.length > 0) {
          await this.schooldayRepository.save(toInsert);
        }

        // 6. group.days 갱신
        group.days = newSchooldays.length;
        await this.groupRepository.save(group);

        totalDays += newSchooldays.length;
      }
    }
    return totalDays;
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  async remove(id: number): Promise<Lesson> {
    const lesson = await this.findById(id);
    return await this.lessonRepository.remove(lesson);
  }
}
