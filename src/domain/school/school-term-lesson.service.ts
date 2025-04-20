import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Category } from 'src/domain/category/entities/category.entity';
import { InstructorLesson } from 'src/domain/instructor/entities/instructor-lesson.entity';
import { CreateLessonDto } from 'src/domain/lesson/dto/create-lesson.dto';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { DataSource, In, IsNull } from 'typeorm';

@Injectable()
export class SchoolTermLessonService {
  private readonly logger = new Logger(SchoolTermLessonService.name);

  constructor(private readonly dataSource: DataSource) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateLessonDto): Promise<Lesson> {
    return await this.dataSource.transaction(async (manager) => {
      //? 1. Find school
      const school = await manager.findOne(School, {
        where: {
          id: dto.schoolId,
        },
      });

      if (!school) {
        throw new NotFoundException('School not found');
      }

      //? 2. Find or create lesson using unique constraint
      const existingLesson = await manager.findOne(Lesson, {
        where: {
          termId: dto.termId,
          schoolId: dto.schoolId,
          name: dto.name,
        },
      });

      const lesson = existingLesson
        ? await manager.save(Lesson, {
            ...existingLesson,
            ...dto,
            schoolName: school.name,
            operationFeeRule: school.operationFeeRule,
            requiredDocuments: dto.requiredDocuments || [],
          })
        : await manager.save(Lesson, {
            ...dto,
            schoolName: school.name,
            operationFeeRule: school.operationFeeRule,
            requiredDocuments: dto.requiredDocuments || [],
          });

      //? 3. Handle instructor relationships
      if (dto.groups?.length) {
        // Get or create instructors using raw queries for atomic operations
        const instructorPromises = dto.groups.map(async (group) => {
          await manager.query(
            `INSERT INTO instructors
              (name, phone, registeredDocuments)
              VALUES (?, ?, ?)
              ON DUPLICATE KEY UPDATE registeredDocuments = registeredDocuments`,
            [group.instructorName, group.instructorPhone, JSON.stringify([])],
          );

          // Then get the instructor ID
          const [instructor] = await manager.query<{ id: number }[]>(
            `SELECT id FROM instructors WHERE name = ? AND phone = ?`,
            [group.instructorName, group.instructorPhone],
          );

          return instructor;
        });
        const instructors = await Promise.all(instructorPromises);

        // Soft delete existing instructor-lesson relationships
        await manager.update(
          InstructorLesson,
          { lessonId: lesson.id, deletedAt: IsNull() },
          { deletedAt: new Date() },
        );

        //? Create new instructor-lesson relationships (instructor_lesson)
        const instructorLessonPromises = instructors.map((instructor) =>
          manager.query(
            `INSERT INTO instructor_lesson
              (instructorId, lessonId)
              VALUES (?, ?)`,
            [instructor.id, lesson.id],
          ),
        );

        await Promise.all(instructorLessonPromises);

        //? Update school-instructor relationships (instructor_school)
        await Promise.all(
          instructors.map((instructor) =>
            manager.query(
              'INSERT IGNORE INTO `instructor_school` (instructorId, schoolId) VALUES (?, ?)',
              [instructor.id, dto.schoolId],
            ),
          ),
        );
      }

      //? 4. Handle category relationship (category_lesson)
      if (dto.category) {
        const category = await manager.findOne(Category, {
          where: { slug: dto.category },
        });

        if (!category) {
          throw new NotFoundException(
            `Category with slug '${dto.category}' not found`,
          );
        }

        await manager.query(
          `INSERT IGNORE INTO category_lesson 
            (categoryId, lessonId) 
            VALUES (?, ?)`,
          [category.id, lesson.id],
        );
      }

      return lesson;
    });
  }

  //! precondition: all the DTOs have the same schoolId and termId
  //! precondition: name (강좌명) is unique in the same term
  async createBulk(dtos: CreateLessonDto[]): Promise<Lesson[]> {
    return await this.dataSource.transaction(async (manager) => {
      const schoolId = dtos[0].schoolId;
      // const termId = dtos[0].termId;
      const lessons: Lesson[] = [];

      //? 1. Find school
      const school = await manager.findOne(School, {
        where: {
          id: schoolId,
        },
      });

      if (!school) {
        throw new NotFoundException('School not found');
      }

      //? 2. Find or create lessons in bulk
      const lessonConditions = dtos.map((dto) => ({
        termId: dto.termId,
        schoolId: dto.schoolId,
        name: dto.name,
      }));
      const existingLessons = await manager.find(Lesson, {
        where: lessonConditions,
      });
      const existingLessonMap = new Map(
        existingLessons.map((l) => [`${l.schoolId}-${l.termId}-${l.name}`, l]),
      );

      const lessonsToSave = dtos.map((dto) => {
        const key = `${dto.schoolId}-${dto.termId}-${dto.name}`;
        const existingLesson = existingLessonMap.get(key);

        return {
          ...(existingLesson ? { ...existingLesson, ...dto } : dto),
          schoolName: school.name,
          operationFeeRule: school.operationFeeRule,
          requiredDocuments: dto.requiredDocuments || [],
        };
      });

      const savedLessons = await manager.save(Lesson, lessonsToSave, {
        chunk: 100,
      });
      lessons.push(...savedLessons);

      //? 3. Handle instructor relationships in bulk
      const instructorData = dtos
        .filter((dto) => dto.groups?.length)
        .flatMap((dto, index) =>
          dto.groups.map((group) => ({
            name: group.instructorName,
            phone: group.instructorPhone,
            lessonId: savedLessons[index].id,
            schoolId: dto.schoolId,
          })),
        );

      if (instructorData.length) {
        // Bulk insert instructors with ON DUPLICATE KEY UPDATE
        const instructorInsertValues = instructorData.map((data) => [
          data.name,
          data.phone,
          JSON.stringify([]), // registeredDocuments
        ]);
        await manager.query(
          `INSERT INTO instructors
            (name, phone, registeredDocuments)
            VALUES ${instructorData.map(() => '(?, ?, ?)').join(',')}
            ON DUPLICATE KEY UPDATE registeredDocuments = registeredDocuments`,
          instructorInsertValues.flat(),
        );

        // Fetch all instructors in one query
        const instructors: { id: number; name: string; phone: string }[] =
          await manager.query(
            `SELECT id, name, phone FROM instructors 
            WHERE (name, phone) IN (${instructorData
              .map(() => '(?, ?)')
              .join(',')})`,
            instructorData.flatMap((data) => [data.name, data.phone]),
          );
        const instructorMap = new Map(
          instructors.map((i) => [`${i.name}-${i.phone}`, i.id]),
        );

        // Soft delete existing instructor-lesson relationships
        await manager.update(
          InstructorLesson,
          { lessonId: In(savedLessons.map((l) => l.id)), deletedAt: IsNull() },
          { deletedAt: new Date() },
        );

        // Bulk insert instructor-lesson relationships
        const instructorLessonValues = instructorData.map((data) => [
          instructorMap.get(`${data.name}-${data.phone}`),
          data.lessonId,
        ]);
        await manager.query(
          `INSERT INTO instructor_lesson
            (instructorId, lessonId)
            VALUES ${instructorLessonValues.map(() => '(?, ?)').join(',')}`,
          instructorLessonValues.flat(),
        );

        // Bulk insert school-instructor relationships
        const schoolInstructorValues = instructorData.map((data) => [
          instructorMap.get(`${data.name}-${data.phone}`),
          data.schoolId,
        ]);
        await manager.query(
          `INSERT IGNORE INTO instructor_school
            (instructorId, schoolId)
            VALUES ${schoolInstructorValues.map(() => '(?, ?)').join(',')}`,
          schoolInstructorValues.flat(),
        );
      }

      //? 4. Handle category relationships in bulk
      const categoryData = dtos
        .filter((dto) => dto.category)
        .map((dto, index) => ({
          slug: dto.category,
          lessonId: savedLessons[index].id,
        }));

      if (categoryData.length) {
        const categories = await manager.find(Category, {
          where: { slug: In(categoryData.map((cd) => cd.slug)) },
        });
        const categoryMap = new Map(categories.map((c) => [c.slug, c.id]));

        const missingCategories = categoryData
          .filter((cd) => !categoryMap.has(cd.slug))
          .map((cd) => cd.slug);
        if (missingCategories.length) {
          throw new NotFoundException(
            `Categories not found: ${missingCategories.join(', ')}`,
          );
        }

        const categoryLessonValues = categoryData.map((cd) => [
          categoryMap.get(cd.slug),
          cd.lessonId,
        ]);
        await manager.query(
          `INSERT IGNORE INTO category_lesson
            (categoryId, lessonId)
            VALUES ${categoryLessonValues.map(() => '(?, ?)').join(',')}`,
          categoryLessonValues.flat(),
        );
      }

      return lessons;
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async infiniteList(
    schoolId: number,
    termId: number,
    query: PaginateQuery,
  ): Promise<Paginated<Lesson>> {
    const queryBuilder = this.dataSource
      .getRepository(Lesson)
      .createQueryBuilder('lesson')
      .where('lesson.schoolId = :schoolId', { schoolId })
      .andWhere('lesson.termId = :termId', { termId });

    return await paginate(query, queryBuilder, {
      relations: {
        term: true,
        groups: true,
        categories: true,
      },
      sortableColumns: ['id', 'name', 'termId'],
      searchableColumns: ['name', 'schoolName'],
      defaultSortBy: [
        ['schoolId', 'DESC'],
        ['id', 'DESC'],
      ],
      filterableColumns: {
        schoolName: [FilterOperator.EQ, FilterOperator.ILIKE],
        name: [FilterOperator.EQ, FilterOperator.ILIKE],
      },
    });
  }

  async list(schoolId: number, termId: number): Promise<Lesson[]> {
    const queryBuilder = this.dataSource
      .getRepository(Lesson)
      .createQueryBuilder('lesson')
      .leftJoinAndSelect('lesson.groups', 'group')
      .where('lesson.schoolId = :schoolId', { schoolId })
      .andWhere('lesson.termId = :termId', { termId })
      .orderBy('lesson.id', 'DESC');

    return await queryBuilder.getMany();
  }
}
