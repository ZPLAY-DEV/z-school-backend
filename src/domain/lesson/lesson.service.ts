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
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
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
    @InjectRepository(Schoolday)
    private readonly schooldayRepository: Repository<Schoolday>,
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

    let totalDays = 0;
    for (const group of lesson.groups) {
      const calendarDays = calculateLessonDays(lesson, group);
      // 기존 schooldays 삭제 (옵션)
      await this.schooldayRepository.delete({ groupId: group.id });
      // 새 schooldays 생성
      const schooldays: Schoolday[] = calendarDays
        .filter((day) => day.classOn)
        .map((day) => {
          // start, end: 'YYYY-MM-DD HH:mm'
          const [startDateStr, startTimeStr] = day.start.split(' ');
          const [endDateStr, endTimeStr] = day.end.split(' ');
          return this.schooldayRepository.create({
            schoolId: lesson.schoolId,
            termId: lesson.termId,
            lessonId: lesson.id,
            groupId: group.id,
            name: null,
            startStr: day.start,
            endStr: day.end,
            duration: 0, // 필요시 계산
            startsAt: new Date(`${startDateStr}T${startTimeStr}:00+09:00`),
            endsAt: new Date(`${endDateStr}T${endTimeStr}:00+09:00`),
            note: null,
          });
        });
      if (schooldays.length > 0) {
        await this.schooldayRepository.save(schooldays);
      }
      group.days = schooldays.length;
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
