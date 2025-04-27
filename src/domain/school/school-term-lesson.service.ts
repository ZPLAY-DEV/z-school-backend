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
import { parseRangeToArray } from 'src/helpers/parse';
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
      //? 1단계) Find school
      const school = await manager.findOne(School, {
        where: {
          id: dto.schoolId,
        },
      });

      if (!school) {
        throw new NotFoundException('School not found');
      }

      //? 2단계) 같은 이름의 기존 강좌가 존재하면 업데이트, 없으면 생성
      const existingLesson = await manager.findOne(Lesson, {
        where: {
          termId: dto.termId,
          schoolId: dto.schoolId,
          lessonName: dto.lessonName,
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
    const year = new Date().getFullYear();

    return await this.dataSource.transaction(async (manager) => {
      const schoolId = dtos[0].schoolId;
      // const termId = dtos[0].termId;
      const lessons: Lesson[] = [];

      //? 1단계) Find school
      const school = await manager.findOne(School, {
        where: {
          id: schoolId,
        },
        relations: {
          terms: true,
        },
      });

      if (!school) {
        throw new NotFoundException('School not found');
      }

      const term = school.terms.reduce((prev, curr) => {
        return !prev || curr.id > prev.id ? curr : prev;
      }, school.terms[0] || null);

      //? 2단계) 같은 이름의 기존 강좌가 존재하면 업데이트, 없으면 생성
      const lessonConditions = dtos.map((dto) => ({
        termId: dto.termId,
        schoolId: dto.schoolId,
        lessonName: dto.lessonName,
      }));
      const existingLessons = await manager.find(Lesson, {
        where: lessonConditions,
      });
      const existingLessonMap = new Map(
        existingLessons.map((l) => [
          `${l.schoolId}-${l.termId}-${l.lessonName}`,
          l,
        ]),
      );
      // 여기서 cascade 로 group 도 같이 저장됨. 따라서, allowedGrades 를 처리를 위한 좋은 타이밍
      const lessonsToSave = dtos.map((dto) => {
        const key = `${dto.schoolId}-${dto.termId}-${dto.lessonName}`;
        const existingLesson = existingLessonMap.get(key);
        dto.groups.forEach((group) => {
          if (group.allowedGradesInString) {
            group.allowedGrades = parseRangeToArray(
              group.allowedGradesInString,
            );
          }
        });
        return {
          ...(existingLesson ? { ...existingLesson, ...dto } : dto),
          start: dto.start || term?.start || `${year}-01-01`,
          end: dto.end || term?.end || `${year}-12-31`,
          schoolName: school.name,
          operationFeeRule: school.operationFeeRule,
          requiredDocuments: dto.requiredDocuments || [],
        };
      });
      // 몽땅 저장 후 배열에 넣어둠
      const savedLessons = await manager.save(Lesson, lessonsToSave, {
        chunk: 100,
      });
      lessons.push(...savedLessons);

      //? 3단계) 강사 관계 처리
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

        // 기존 instructor-lesson relationships 모두 soft delete
        await manager.update(
          InstructorLesson,
          { lessonId: In(savedLessons.map((l) => l.id)), deletedAt: IsNull() },
          { deletedAt: new Date() },
        );

        // 새로운 instructor-lesson relationships 몽땅 다시 추가
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

        // school-instructor 관계도 모두 upsert
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

      //? 4단계) 카테고리 관계 처리
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
