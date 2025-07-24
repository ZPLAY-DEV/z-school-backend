import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { ClassStatus } from 'src/common/enums';
import { Group } from 'src/domain/group/entities/group.entity';
import { CreateLessonDto } from 'src/domain/lesson/dto/create-lesson.dto';
import { ExtendedStudentDto } from 'src/domain/lesson/dto/extended-student.dto';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Student } from 'src/domain/student/entities/student.entity';
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
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    private readonly lessonCoreService: LessonCoreService,
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
  ): Promise<Paginated<ExtendedStudentDto>> {
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

    // Student 데이터를 ExtendedStudentDto로 변환
    const extendedStudents: ExtendedStudentDto[] = uniqueStudents.map(
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

        // ExtendedStudentDto 클래스 인스턴스 생성
        return new ExtendedStudentDto({
          ...studentWithoutPicks,
          groupName,
          groupStart,
          groupStartedBy,
        });
      },
    );

    return {
      ...result,
      data: extendedStudents,
    } as Paginated<ExtendedStudentDto>;
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
