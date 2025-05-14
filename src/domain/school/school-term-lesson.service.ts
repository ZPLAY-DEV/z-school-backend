import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { CreateLessonDto } from 'src/domain/lesson/dto/create-lesson.dto';
import { UpdateLessonDto } from 'src/domain/lesson/dto/update-lesson.dto';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { LessonCoreService } from 'src/domain/lesson/lesson-core.service';
import { Repository } from 'typeorm';

@Injectable()
export class SchoolTermLessonService {
  private readonly logger = new Logger(SchoolTermLessonService.name);

  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    private readonly lessonCoreService: LessonCoreService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  async createBulk(
    dtos: CreateLessonDto[],
    dryrun: boolean = false,
  ): Promise<Lesson[]> {
    if (dryrun) {
      return await this.checkExistingLessons(dtos);
    }

    const lessons: Lesson[] = [];
    for (const dto of dtos) {
      const lesson = await this.lessonCoreService.create(dto);
      lessons.push(lesson);
    }
    return lessons;
  }

  /**
   * Check for existing lessons that would be overwritten based on the compound unique key
   * (termId, schoolId, lessonName)
   */
  private async checkExistingLessons(
    dtos: CreateLessonDto[],
  ): Promise<Lesson[]> {
    // Extract unique key combinations from DTOs
    const uniqueKeyCombinations = dtos.map((dto) => ({
      termId: dto.termId,
      schoolId: dto.schoolId,
      lessonName: dto.lessonName,
    }));

    // Find existing lessons that match any of these combinations
    const existingLessons = await this.lessonRepository.find({
      where: uniqueKeyCombinations.map((combo) => ({
        termId: combo.termId,
        schoolId: combo.schoolId,
        lessonName: combo.lessonName,
      })),
      relations: {
        category: true,
        groups: {
          instructor: true,
        },
      },
    });

    // No existing lessons found means no records will be overwritten
    if (existingLessons.length === 0) {
      return [];
    }

    return existingLessons;
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async infiniteList(
    schoolId: number,
    termId: number,
    query: PaginateQuery,
  ): Promise<Paginated<Lesson>> {
    const queryBuilder = this.lessonRepository
      .createQueryBuilder('lesson')
      .where('lesson.schoolId = :schoolId', { schoolId })
      .andWhere('lesson.termId = :termId', { termId });

    return await paginate(query, queryBuilder, {
      relations: {
        groups: { instructor: true },
        category: true,
      },
      sortableColumns: ['id', 'lessonName', 'termId'],
      searchableColumns: ['schoolName', 'lessonName'],
      defaultSortBy: [
        ['schoolId', 'DESC'],
        ['id', 'DESC'],
      ],
      filterableColumns: {
        schoolName: [FilterOperator.EQ, FilterOperator.ILIKE],
        lessonName: [FilterOperator.EQ, FilterOperator.ILIKE],
      },
    });
  }

  async list(schoolId: number, termId: number): Promise<Lesson[]> {
    const queryBuilder = this.lessonRepository
      .createQueryBuilder('lesson')
      .leftJoinAndSelect('lesson.category', 'category')
      .leftJoinAndSelect('lesson.groups', 'group')
      .leftJoinAndSelect('group.instructor', 'instructor')
      .where('lesson.schoolId = :schoolId', { schoolId })
      .andWhere('lesson.termId = :termId', { termId })
      .orderBy('lesson.id', 'DESC');

    return await queryBuilder.getMany();
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateLessonDto): Promise<Lesson> {
    return await this.lessonCoreService.update(id, dto);
  }

  //?-------------------------------------------------------------------------//
  //? DELETE
  //?-------------------------------------------------------------------------//

  async deleteAll(schoolId: number, termId: number): Promise<number> {
    try {
      const result = await this.lessonRepository.manager.transaction(
        async (transactionalEntityManager) => {
          const result = await transactionalEntityManager
            .createQueryBuilder()
            .delete()
            .from(Lesson)
            .where('schoolId = :schoolId AND termId = :termId', {
              schoolId,
              termId,
            })
            .execute();

          return result.affected;
        },
      );

      return result || 0;
    } catch (error) {
      this.logger?.error(error);
      throw new BadRequestException(HttpErrorConstants.CONDITION_NOT_MET);
    }
  }
}
