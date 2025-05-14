import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { Group } from 'src/domain/group/entities/group.entity';
import { InstructorLesson } from 'src/domain/instructor/entities/instructor-lesson.entity';
import { CreateLessonDto } from 'src/domain/lesson/dto/create-lesson.dto';
import { UpdateLessonDto } from 'src/domain/lesson/dto/update-lesson.dto';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import {
  parseRangeFormat,
  parseTime,
  parseTimeFormat,
} from 'src/helpers/parse';
import {
  DataSource,
  DeepPartial,
  EntityManager,
  IsNull,
  Repository,
} from 'typeorm';

@Injectable()
export class LessonCoreService {
  private readonly logger = new Logger(LessonCoreService.name);

  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    private readonly dataSource: DataSource,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateLessonDto): Promise<Lesson> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      //? 1단계) Find school
      const school = await manager.findOne(School, {
        where: { id: dto.schoolId },
      });
      if (!school) {
        throw new NotFoundException(HttpErrorConstants.NOT_FOUND_SCHOOL);
      }

      //? 2단계) Find term to use start/end dates
      const term = await manager.findOne(Term, {
        where: { id: dto.termId },
      });
      if (!term) {
        throw new NotFoundException(HttpErrorConstants.NOT_FOUND_TERM);
      }

      //? 3단계) 같은 이름의 기존 강좌가 있는지 확인
      const existingLesson = await manager.findOne(Lesson, {
        where: {
          termId: dto.termId,
          schoolId: dto.schoolId,
          lessonName: dto.lessonName,
        },
        relations: { groups: true },
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

      // 최종 데이터를 다시 로드하여 변환된 값을 반환
      const savedLesson = await manager.findOne(Lesson, {
        where: { id: lesson.id },
        relations: { groups: true, category: true },
      });

      if (!savedLesson) {
        throw new NotFoundException(HttpErrorConstants.NOT_FOUND_LESSON);
      }

      return savedLesson;
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  //! 1) 반 이름을 변경한 경우, 기존 반 삭제후 무조건 새로운 반 생성하지 않고, 요일 및 시간을
  //!    추가로 비교하여 그 값들이 같다면, 반 이름만 변경하는 시도로 판단하여 업데이트 진행.
  //! 2) 반 이름과 요일 및 시간을 동시에 변경한 경우, 기존 반 삭제 후 새로운 반 생성.

  async update(
    id: number,
    dto: UpdateLessonDto,
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
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_LESSON);
    }

    //? 2단계) 학교 정보 확인
    const school = await manager.findOne(School, {
      where: { id: dto.schoolId },
    });
    if (!school) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_SCHOOL);
    }

    //? 3단계) 학기 정보 확인
    const term = await manager.findOne(Term, {
      where: { id: dto.termId },
    });
    if (!term) {
      throw new NotFoundException('Term not found');
    }

    //? 4단계) 기존 그룹 ID 매핑
    if (dto.groups?.length) {
      // 기존 GroupId 를 보존하도록 매핑
      dto.groups = dto.groups.map((groupDto) => {
        // Try to find matching group first by name
        let existingGroup = existingLesson.groups.find(
          (g) => g.groupName === groupDto.groupName,
        );

        // If not found by name, try to find by weekday, start and end time
        if (!existingGroup) {
          const dtoStart = parseTimeFormat(parseTime(groupDto.start));
          const dtoEnd = parseTimeFormat(parseTime(groupDto.end));

          existingGroup = existingLesson.groups.find(
            (g) =>
              g.weekday === groupDto.weekday &&
              (g.start === dtoStart || g.start === groupDto.start) &&
              (g.end === dtoEnd || g.end === groupDto.end),
          );
        }

        return existingGroup
          ? { ...groupDto, lessonId: existingLesson.id, id: existingGroup.id }
          : { ...groupDto, lessonId: existingLesson.id };
      });

      // 매핑되지 않은 기존 그룹을 찾아서 삭제
      const newGroupIds = dto.groups
        .filter((g) => g.id !== undefined)
        .map((g) => g.id);

      const groupsToDelete = existingLesson.groups.filter(
        (group) => !newGroupIds.includes(group.id),
      );

      if (groupsToDelete.length > 0) {
        await manager.softDelete(
          Group,
          groupsToDelete.map((g) => g.id),
        );
      }
    }

    //? 5단계) 강좌 업데이트
    const updatedLesson = await manager
      .save(Lesson, {
        ...existingLesson,
        ...dto,
        schoolName: school.name,
        operationFeeRule: school.operationFeeRule,
        requiredDocuments: dto.requiredDocuments || [],
      })
      .catch((error) => {
        console.log(`🔴 허용하지 않는 입력 조합 오류`, error);
        throw new UnprocessableEntityException(
          HttpErrorConstants.INVALID_CONSTRAINT,
        );
      });

    //? 6단계) 그룹 및 강사 정보 처리
    if (dto.groups?.length) {
      await this.processGroups(updatedLesson, dto, manager);
    }

    // 최종 데이터를 다시 로드하여 변환된 값을 반환
    const finalLesson = await manager.findOne(Lesson, {
      where: { id },
      relations: { groups: true, category: true },
    });

    if (!finalLesson) {
      throw new NotFoundException(`Cannot find updated lesson with ID ${id}`);
    }

    return finalLesson;
  }

  //? ---------------------------------------------------------------------- ?//
  //? HELPER METHODS
  //? ---------------------------------------------------------------------- ?//

  private async processGroups(
    lesson: Lesson,
    dto: CreateLessonDto | UpdateLessonDto,
    manager: EntityManager,
  ): Promise<void> {
    // Get or create instructors first
    const instructorPromises =
      dto.groups?.map(async (groupDto) => {
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
      }) || [];

    const instructorsWithGroupData = await Promise.all(instructorPromises);

    // Upsert groups with both lessonId and instructorId
    for (const { instructorId, groupData } of instructorsWithGroupData) {
      // 수업 시작 시간과 종료 시간을 24시간 형식으로 변환
      const groupStart = parseTimeFormat(parseTime(groupData.start));
      const groupEnd = parseTimeFormat(parseTime(groupData.end));
      const groupAllowedGrades = parseRangeFormat(groupData.allowedGrades).join(
        ',',
      );

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
      const newGroupNames = dto.groups?.map((g) => g.groupName || '') || [];
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
    // instructor_lesson 관계 업데이트 (무조건 soft delete 후 재생성)
    // ---------------------------------------------------------------------- //

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
    // instructor_school 관계 업데이트 (todo. 삭제관련 처리 필요할지도)
    // ---------------------------------------------------------------------- //

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
}
