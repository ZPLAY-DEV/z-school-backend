import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Category as CategoryEnum } from 'src/common/enums';
import { Category } from 'src/domain/category/entities/category.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { InstructorLesson } from 'src/domain/instructor/entities/instructor-lesson.entity';
import { CreateLessonDto } from 'src/domain/lesson/dto/create-lesson.dto';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { parseTime } from 'src/helpers/bitmask';
import {
  DataSource,
  DeepPartial,
  EntityManager,
  FindOptionsWhere,
  IsNull,
} from 'typeorm';

@Injectable()
export class SchoolTermLessonService {
  private readonly logger = new Logger(SchoolTermLessonService.name);

  constructor(private readonly dataSource: DataSource) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateLessonDto): Promise<Lesson> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      //? 1단계) Find school
      const school = await manager.findOne(School, {
        where: { id: dto.schoolId },
      });
      if (!school) {
        throw new NotFoundException('School not found');
      }

      //? 2단계) Find term to use start/end dates
      const term = await manager.findOne(Term, {
        where: { id: dto.termId },
      });
      if (!term) {
        throw new NotFoundException('Term not found');
      }

      //? 3단계) 같은 이름의 기존 강좌가 있는지 확인
      const existingLesson = await manager.findOne(Lesson, {
        where: {
          termId: dto.termId,
          schoolId: dto.schoolId,
          lessonName: dto.lessonName,
        },
      });

      if (existingLesson) {
        return this.update(existingLesson.id, dto, manager);
      }

      //? 4단계) 새로운 강좌 생성
      const lesson = await manager.save(Lesson, {
        ...dto,
        start: dto.start ?? term.start,
        end: dto.end ?? term.end,
        schoolName: school.name,
        operationFeeRule: school.operationFeeRule,
        requiredDocuments: dto.requiredDocuments || [],
      });

      //? 5단계) 그룹 및 강사 정보 처리
      if (dto.groups?.length) {
        await this.processGroups(lesson, dto, manager);
      }

      //? 6단계) 카테고리 관계 설정
      if (dto.category) {
        await this.processCategory(lesson, dto.category, manager);
      }

      // 최종 데이터를 다시 로드하여 변환된 값을 반환
      const savedLesson = await manager.findOne(Lesson, {
        where: { id: lesson.id },
        relations: { groups: true, categories: true },
      });

      if (!savedLesson) {
        throw new NotFoundException(
          `Cannot find saved lesson with ID ${lesson.id}`,
        );
      }

      return savedLesson;
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  async update(
    id: number,
    dto: CreateLessonDto,
    manager?: EntityManager,
  ): Promise<Lesson> {
    // manager가 제공되지 않은 경우(직접 호출) 새로운 트랜잭션 시작
    if (!manager) {
      return this.dataSource.transaction(
        async (transactionManager: EntityManager) => {
          return this.update(id, dto, transactionManager);
        },
      );
    }

    //? 1단계) 업데이트할 강좌 찾기
    const existingLesson = await manager.findOne(Lesson, {
      where: { id },
      relations: {
        groups: true,
      },
    });

    if (!existingLesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    //? 2단계) 학교 정보 확인
    const school = await manager.findOne(School, {
      where: { id: dto.schoolId },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }

    //? 3단계) 기존 그룹 ID 매핑
    if (dto.groups?.length) {
      // 기존 GroupId 를 보존하도록 매핑
      dto.groups = dto.groups.map((groupDto) => {
        const existingGroup = existingLesson.groups.find(
          (g) => g.groupName === groupDto.groupName,
        );
        return existingGroup
          ? { ...groupDto, lessonId: existingLesson.id, id: existingGroup.id }
          : { ...groupDto, lessonId: existingLesson.id };
      });
    }

    //? 4단계) 강좌 업데이트
    const updatedLesson = await manager.save(Lesson, {
      ...existingLesson,
      ...dto,
      schoolName: school.name,
      operationFeeRule: school.operationFeeRule,
      requiredDocuments: dto.requiredDocuments || [],
    });

    //? 5단계) 그룹 및 강사 정보 처리
    if (dto.groups?.length) {
      await this.processGroups(updatedLesson, dto, manager);
    }

    //? 6단계) 카테고리 관계 설정
    if (dto.category) {
      await this.processCategory(updatedLesson, dto.category, manager);
    }

    // 최종 데이터를 다시 로드하여 변환된 값을 반환
    const finalLesson = await manager.findOne(Lesson, {
      where: { id: updatedLesson.id },
      relations: { groups: true, categories: true },
    });

    if (!finalLesson) {
      throw new NotFoundException(
        `Cannot find updated lesson with ID ${updatedLesson.id}`,
      );
    }

    return finalLesson;
  }

  //? ---------------------------------------------------------------------- ?//
  //? 헬퍼 메서드 - 그룹 처리
  //? ---------------------------------------------------------------------- ?//

  private async processGroups(
    lesson: Lesson,
    dto: CreateLessonDto,
    manager: EntityManager,
  ): Promise<void> {
    // Get or create instructors first
    const instructorPromises = dto.groups.map(async (groupDto) => {
      // Upsert instructor using ON DUPLICATE KEY UPDATE
      await manager.query(
        `INSERT INTO instructors
          (name, phone)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE updatedAt = CURRENT_TIMESTAMP`,
        [groupDto.instructorName, groupDto.instructorPhone],
      );

      // Get the instructor ID
      const [instructor] = await manager.query<{ id: number }[]>(
        `SELECT id FROM instructors WHERE name = ? AND phone = ?`,
        [groupDto.instructorName, groupDto.instructorPhone],
      );

      return {
        lessonId: lesson.id,
        instructorId: instructor.id,
        instructorName: groupDto.instructorName,
        instructorPhone: groupDto.instructorPhone,
        groupData: {
          ...groupDto,
          instructorId: instructor.id,
          lessonId: lesson.id,
        },
      };
    });

    const instructorsWithGroupData = await Promise.all(instructorPromises);

    // Upsert groups with both lessonId and instructorId
    for (const { instructorId, groupData } of instructorsWithGroupData) {
      // 수업 시작 시간과 종료 시간을 24시간 형식으로 변환
      const groupStart = parseTime(groupData.start).join(':');
      const groupEnd = parseTime(groupData.end).join(':');
      const groupAllowedGrades = groupData.allowedGrades || [1, 2, 3, 4, 5, 6];

      // 타입 안전한 방식으로 upsert 데이터 생성
      const upsertData: DeepPartial<Group> = {
        lessonId: lesson.id,
        groupName: groupData.groupName,
        instructorId,
        location: groupData.location,
        capacity: groupData.capacity,
        allowedGrades: groupAllowedGrades,
        weekday: groupData.weekday,
        start: groupStart,
        end: groupEnd,
      };

      // lesson.groups 가 있는 경우, 3단계에서 id 추가
      if ('id' in groupData && groupData.id) {
        upsertData.id = Number(groupData.id);
      }

      await manager
        .getRepository(Group)
        .upsert(upsertData, ['lessonId', 'groupName']);
    }

    // 전달된 DTO에 없는 기존 그룹 찾아서 삭제하기
    const existingLesson = await manager.findOne(Lesson, {
      where: { id: lesson.id },
      relations: { groups: true },
    });

    if (existingLesson && existingLesson.groups.length > 0) {
      const newGroupNames = dto.groups.map((g) => g.groupName || '');
      const groupsToDelete = existingLesson.groups.filter(
        (g) => !newGroupNames.includes(g.groupName || ''),
      );

      if (groupsToDelete.length > 0) {
        await manager.softDelete(
          Group,
          groupsToDelete.map((g) => g.id),
        );
      }
    }

    // ---------------------------------------------------------------------- //
    // instructor_lesson 관계 업데이트
    // ---------------------------------------------------------------------- //

    // 어떤것이 겹치는지 따지지않고 무조건 soft delete 후 재생성
    await manager.update(
      InstructorLesson,
      { lessonId: lesson.id, deletedAt: IsNull() },
      { deletedAt: new Date() },
    );
    const instructorIds = instructorsWithGroupData.map(
      (item) => item.instructorId,
    );
    const instructorLessonPromises = instructorIds.map((instructorId) =>
      manager.query(
        `INSERT INTO instructor_lesson
          (instructorId, lessonId)
          VALUES (?, ?)`,
        [instructorId, lesson.id],
      ),
    );
    await Promise.all(instructorLessonPromises);

    // ---------------------------------------------------------------------- //
    // instructor_school 관계 업데이트
    // ---------------------------------------------------------------------- //
    // todo. 삭제관련 처리 필요할지도
    await Promise.all(
      instructorIds.map((instructorId) =>
        manager.query(
          'INSERT IGNORE INTO `instructor_school` (instructorId, schoolId) VALUES (?, ?)',
          [instructorId, dto.schoolId],
        ),
      ),
    );

    // 저장된 groups 데이터를 lesson 객체에 다시 로드하여 반환값이 transform된 데이터가 되도록 함
    lesson.groups = await manager.find(Group, {
      where: { lessonId: lesson.id, deletedAt: IsNull() },
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? 헬퍼 메서드 - 카테고리 처리
  //? ---------------------------------------------------------------------- ?//

  private async processCategory(
    lesson: Lesson,
    categorySlug: CategoryEnum,
    manager: EntityManager,
  ): Promise<void> {
    const whereCondition: FindOptionsWhere<Category> = { slug: categorySlug };
    const category = await manager.findOne(Category, {
      where: whereCondition,
    });

    if (!category) {
      throw new NotFoundException(
        `Category with slug '${categorySlug}' not found`,
      );
    }

    await manager.query(
      `INSERT IGNORE INTO category_lesson 
        (categoryId, lessonId) 
        VALUES (?, ?)`,
      [category.id, lesson.id],
    );
  }

  //! precondition: all the DTOs have the same schoolId and termId
  //! precondition: name (강좌명) is unique in the same term
  async createBulk(dtos: CreateLessonDto[]): Promise<Lesson[]> {
    // Use transaction to ensure all operations are atomic
    return await this.dataSource.transaction(async () => {
      // Create a new instance of the service to use the transaction manager
      const self = new SchoolTermLessonService(this.dataSource);

      // Process each dto using the improved create method
      const lessonPromises = dtos.map(async (dto) => {
        try {
          return await self.create(dto);
        } catch (error) {
          this.logger.error(
            `Failed to create lesson: ${dto.lessonName}`,
            error.stack,
          );
          throw error;
        }
      });

      return await Promise.all(lessonPromises);
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
