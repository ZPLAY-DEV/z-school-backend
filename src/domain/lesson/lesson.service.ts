import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { Calendar } from 'src/domain/calendar/entities/calendar.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { CreateLessonDto } from 'src/domain/lesson/dto/create-lesson.dto';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { calculateLessonDays } from 'src/helpers/lesson-days.util';
import { Repository } from 'typeorm';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { LessonCoreService } from './lesson-core.service';

@Injectable()
export class LessonService {
  private readonly logger = new Logger(LessonService.name);

  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Calendar)
    private readonly calendarRepository: Repository<Calendar>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
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
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_LESSON);
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateLessonDto): Promise<Lesson> {
    return await this.lessonCoreService.update(id, dto);
  }

  async updateDays(id: number): Promise<number> {
    // 1. Find the lesson and its groups
    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['groups'],
    });
    if (!lesson)
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_LESSON);

    // 2. For each group, update calendarDays
    let totalDays = 0;
    for (const group of lesson.groups) {
      const calendarDays = calculateLessonDays(lesson, group);
      for (const calDay of calendarDays) {
        const [date] = calDay.start.split(' ');
        const calendar = await this.calendarRepository
          .createQueryBuilder('calendar')
          .where('calendar.schoolId = :schoolId', { schoolId: lesson.schoolId })
          .andWhere('calendar.date = :date', { date: date })
          .getOne();
        if (calendar) {
          calDay.classOn = false;
        }
      }

      group.days = calendarDays.filter((day) => day.classOn).length;
      group.calendarDays = calendarDays;
      await this.groupRepository.save(group);
      totalDays += calendarDays.length;
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
