import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CalendarService } from 'src/domain/calendar/calendar.service';
import { CreateGroupWithInstructorDto } from 'src/domain/group/dto/create-group.dto';
import { Group } from 'src/domain/group/entities/group.entity';
import { CreateLessonDto } from 'src/domain/lesson/dto/create-lesson.dto';
import { UpdateLessonDto } from 'src/domain/lesson/dto/update-lesson.dto';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { generateSchooldays } from 'src/helpers/lesson-days.util';
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

type GroupSamData = CreateGroupWithInstructorDto & {
  lessonId: number;
  samId: number;
};

@Injectable()
export class LessonCoreService {
  private readonly logger = new Logger(LessonCoreService.name);

  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    private readonly dataSource: DataSource,
    private readonly calendarService: CalendarService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateLessonDto): Promise<Lesson> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      //? 1단계) 학교 정보 확인
      const school = await manager.findOne(School, {
        where: { id: dto.schoolId },
      });
      if (!school) {
        throw new NotFoundException('School not found');
      }

      //? 2단계) 학기 정보 확인
      const term = await manager.findOne(Term, {
        where: { id: dto.termId },
      });
      if (!term) {
        throw new NotFoundException('Term not found');
      }

      if (
        (dto.start &&
          new Date(`${dto.start}T09:00:00+09:00`) < term.startDate) ||
        (dto.end && new Date(`${dto.end}T09:00:00+09:00`) > term.endDate)
      ) {
        throw new BadRequestException('Out of range');
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
        frequency: dto.frequency ?? 1,
        operationFeeRule: school.operationFeeRule,
        requiredDocuments: dto.requiredDocuments || [],
      });

      //? 5단계) 반(Group)과 쌤(Sam) 정보 처리
      if (dto.groups?.length) {
        await this.processGroups(lesson, dto.schoolId, dto.groups, manager);
      }

      // 최종 데이터를 다시 로드하여 변환된 값을 반환
      const savedLesson = await manager.findOneOrFail(Lesson, {
        where: { id: lesson.id },
        relations: { groups: true, category: true },
      });

      const offdays: string[] = await this.calendarService.findByDateRange(
        savedLesson.schoolId,
        savedLesson.start,
        savedLesson.end,
      );

      //? 6단계) 학업요일 days 정보 및 schooldays 처리
      for (const group of savedLesson.groups) {
        // 1. 기존 schooldays를 key-value로 변환 (unique constraint 기준)
        const existingSchooldays = await manager
          .getRepository('Schoolday')
          .find({ where: { groupId: group.id } });
        const existingMap = new Map<string, Schoolday>();
        for (const sd of existingSchooldays) {
          const key = `${sd.schoolId}|${sd.termId}|${sd.lessonId}|${sd.groupId}|${sd.name || ''}|${sd.startsAt.toISOString()}|${sd.endsAt.toISOString()}`;
          existingMap.set(key, sd as Schoolday);
        }

        // 2. 새로 생성될 schooldays
        const newSchooldays: Schoolday[] = generateSchooldays(
          savedLesson,
          group,
          offdays,
        );
        const newMap = new Map<string, Schoolday>();
        for (const sd of newSchooldays) {
          const key = `${sd.schoolId}|${sd.termId}|${sd.lessonId}|${sd.groupId}|${sd.name || ''}|${sd.startsAt.toISOString()}|${sd.endsAt.toISOString()}`;
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

        // 5. 실제 DB 반영
        if (toDelete.length > 0) {
          await manager
            .getRepository('Schoolday')
            .delete(toDelete.map((sd) => sd.id));
        }
        if (toInsert.length > 0) {
          await manager
            .getRepository(Schoolday)
            .upsert(toInsert, [
              'schoolId',
              'termId',
              'lessonId',
              'groupId',
              'name',
              'startsAt',
              'endsAt',
            ]);
        }

        // 6. group.days 갱신
        group.days = newSchooldays.length;
        await manager.save(group);
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

    //? 0단계) 업데이트할 강좌 찾기
    const existingLesson = await manager.findOne(Lesson, {
      where: { id },
      relations: {
        groups: true,
      },
    });
    if (!existingLesson) {
      throw new NotFoundException('Lesson not found');
    }

    //? 1단계) 학교 정보 확인
    const school = await manager.findOne(School, {
      where: { id: dto.schoolId },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }

    //? 2단계) 학기 정보 확인
    const term = await manager.findOne(Term, {
      where: { id: dto.termId },
    });
    if (!term) {
      throw new NotFoundException('Term not found');
    }

    //? 3단계) 기존 반(group)정보 매핑
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

    //? 4단계) 강좌 업데이트
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
        throw new UnprocessableEntityException('Invalid constraint');
      });

    //? 5단계) 반(Group)과 쌤(Sam) 정보 처리
    if (dto.groups?.length) {
      await this.processGroups(
        updatedLesson,
        dto.schoolId!,
        dto.groups,
        manager,
      );
    }

    // 최종 데이터를 다시 로드하여 변환된 값을 반환
    const finalLesson = await manager.findOneOrFail(Lesson, {
      where: { id },
      relations: { groups: true, category: true },
    });

    const offdays: string[] = await this.calendarService.findByDateRange(
      finalLesson.schoolId,
      finalLesson.start,
      finalLesson.end,
    );

    //? 6단계) 학업요일 days 정보 및 schooldays 처리
    for (const group of finalLesson.groups) {
      // 1. 기존 schooldays를 key-value로 변환 (unique constraint 기준)
      const existingSchooldays = await manager
        .getRepository('Schoolday')
        .find({ where: { groupId: group.id } });
      const existingMap = new Map<string, Schoolday>();
      for (const sd of existingSchooldays) {
        const key = `${sd.schoolId}|${sd.termId}|${sd.lessonId}|${sd.groupId}|${sd.name || ''}|${sd.startsAt.toISOString()}|${sd.endsAt.toISOString()}`;
        existingMap.set(key, sd as Schoolday);
      }

      // 2. 새로 생성될 schooldays
      const newSchooldays: Schoolday[] = generateSchooldays(
        finalLesson,
        group,
        offdays,
      );
      const newMap = new Map<string, Schoolday>();
      for (const sd of newSchooldays) {
        const key = `${sd.schoolId}|${sd.termId}|${sd.lessonId}|${sd.groupId}|${sd.name || ''}|${sd.startsAt.toISOString()}|${sd.endsAt.toISOString()}`;
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
        await manager
          .getRepository('Schoolday')
          .delete(toDelete.map((sd) => sd.id));
      }
      if (toInsert.length > 0) {
        await manager
          .getRepository(Schoolday)
          .upsert(toInsert, [
            'schoolId',
            'termId',
            'lessonId',
            'groupId',
            'name',
            'startsAt',
            'endsAt',
          ]);
      }

      // 6. group.days 갱신
      group.days = newSchooldays.length;
      await manager.save(group);
    }

    return finalLesson;
  }

  //? ---------------------------------------------------------------------- ?//
  //? HELPER METHODS
  //? ---------------------------------------------------------------------- ?//

  private async processGroups(
    lesson: Lesson,
    schoolId: number,
    groups: CreateGroupWithInstructorDto[],
    manager: EntityManager,
  ): Promise<void> {
    const uniqueSams = new Map<string, number>(); // key: `${instructorName}-${instructorPhone}`
    const groupsWithSamData: GroupSamData[] = [];

    for (const groupDto of groups || []) {
      const instructorKey = `${groupDto.instructorName}-${groupDto.instructorPhone}`;

      // 이미 처리한 쌤인지 확인
      if (uniqueSams.has(instructorKey)) {
        const samId = uniqueSams.get(instructorKey)!;
        groupsWithSamData.push({
          lessonId: lesson.id,
          samId,
          ...groupDto,
        });
        continue;
      }

      // 1. Find or create Instructor
      let instructor = await manager.getRepository('Instructor').findOne({
        where: {
          phone: groupDto.instructorPhone,
        },
      });
      if (!instructor) {
        instructor = await manager.getRepository('Instructor').save({
          name: groupDto.instructorName,
          phone: groupDto.instructorPhone,
        });
      }
      if (!instructor || !instructor.id) {
        throw new Error('Failed to find or create Instructor');
      }

      // 2. Find or create Sam (by instructorId, schoolId)
      if (!schoolId) {
        throw new Error('schoolId is required in DTO');
      }
      let sam = await manager.getRepository('Sam').findOne({
        where: { instructorId: instructor.id, schoolId },
      });
      if (!sam) {
        sam = await manager.getRepository('Sam').save({
          instructorId: instructor.id,
          schoolId: schoolId,
          alias: groupDto.instructorName, // or set as needed
        });
      }
      if (!sam || !sam.id) {
        throw new Error('Failed to find or create Sam');
      }

      uniqueSams.set(instructorKey, Number(sam.id));
      groupsWithSamData.push({
        lessonId: lesson.id,
        samId: Number(sam.id),
        ...groupDto,
      });
    }

    // Upsert groups with both lessonId and samId
    for (const groupData of groupsWithSamData) {
      const groupStart = parseTimeFormat(parseTime(groupData.start));
      const groupEnd = parseTimeFormat(parseTime(groupData.end));
      const groupAllowedGrades = parseRangeFormat(groupData.allowedGrades).join(
        ',',
      );

      const upsertData: DeepPartial<Group> = {
        lessonId: groupData.lessonId,
        groupName: groupData.groupName,
        samId: groupData.samId,
        location: groupData.location,
        capacity: groupData.capacity,
        allowedGrades: groupAllowedGrades,
        weekday: groupData.weekday,
        start: groupStart,
        end: groupEnd,
      };
      if ('id' in groupData && groupData.id) {
        upsertData.id = Number(groupData.id);
      }
      // Ensure lessonId is always set correctly
      upsertData.lessonId = lesson.id;

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
      const newGroupNames = groups?.map((g) => g.groupName || '') || [];
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

    // SamLesson 관계 upsert (samId, lessonId)
    const samIds = Array.from(uniqueSams.values());
    for (const samId of samIds) {
      // Check if SamLesson exists
      const existingSamLesson = await manager.findOne('SamLesson', {
        where: { samId, lessonId: lesson.id },
      });
      if (!existingSamLesson) {
        await manager.save('SamLesson', {
          samId,
          lessonId: lesson.id,
        });
      }
    }

    // 저장된 groups 데이터를 lesson 객체에 다시 로드하여 반환값이 transform된 데이터가 되도록 함
    lesson.groups = await manager.find(Group, {
      where: { lessonId: lesson.id, deletedAt: IsNull() },
    });
  }
}
