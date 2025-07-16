import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CalendarService } from 'src/domain/calendar/calendar.service';
import { Contract } from 'src/domain/contract/entities/contract.entity';
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
import { normalizePhone } from 'src/helpers/phone';
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

      const termStartDate = term.start.toString().split('T')[0];
      const termEndDate = term.end.toString().split('T')[0];

      if (
        (dto.start && dto.start < termStartDate) ||
        (dto.end && dto.end > termEndDate)
      ) {
        throw new BadRequestException(
          'Lesson period out of range based on the term',
        );
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
      const lesson = await manager
        .save(Lesson, {
          ...dto,
          start: dto.start ?? term.start,
          end: dto.end ?? term.end,
          schoolName: school.name,
          frequency: dto.frequency ?? 1,
          operationFeeRule: school.operationFeeRule,
        })
        .catch((error) => {
          console.log(`🔴 허용하지 않는 입력 조합 오류`, error);

          // MySQL Duplicate entry 에러 처리
          if (error.code === 'ER_DUP_ENTRY') {
            // "Duplicate entry '1-2-축구' for key 'lessons.IDX_049a11a698520a6fe613e79468'" 에서 값 추출
            const duplicateMatch = error.sqlMessage.match(
              /Duplicate entry '([^']+)'/,
            );
            if (duplicateMatch) {
              const duplicateValue = duplicateMatch[1];
              const parts = duplicateValue.split('-');
              if (parts.length === 3) {
                const [schoolId, termId, lessonName] = parts;
                throw new UnprocessableEntityException(
                  `강좌명 '${lessonName}'은(는) 이미 해당 학교/학기에 존재합니다. (schoolId: ${schoolId}, termId: ${termId})`,
                );
              }
            }
            throw new UnprocessableEntityException(
              '동일한 강좌명이 이미 존재합니다.',
            );
          }

          throw new UnprocessableEntityException('Invalid constraint');
        });

      //? 5단계) 반(Group)과 쌤(Sam) 정보 처리
      if (dto.groups?.length) {
        await this.processGroups(lesson, dto, manager);
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
    // undefined인 필드들을 제거하여 기존 값을 유지
    const updateData = {
      ...existingLesson,
      schoolName: school.name,
      operationFeeRule: school.operationFeeRule,
    };

    // dto에서 undefined가 아닌 필드들만 업데이트
    Object.keys(dto).forEach((key) => {
      if (dto[key] !== undefined) {
        updateData[key] = dto[key];
      }
    });

    const updatedLesson = await manager
      .save(Lesson, updateData)
      .catch((error) => {
        console.log(`🔴 허용하지 않는 입력 조합 오류`, error);

        // MySQL Duplicate entry 에러 처리
        if (error.code === 'ER_DUP_ENTRY') {
          // "Duplicate entry '1-2-축구' for key 'lessons.IDX_049a11a698520a6fe613e79468'" 에서 값 추출
          const duplicateMatch = error.sqlMessage.match(
            /Duplicate entry '([^']+)'/,
          );
          if (duplicateMatch) {
            const duplicateValue = duplicateMatch[1];
            const parts = duplicateValue.split('-');
            if (parts.length === 3) {
              const [schoolId, termId, lessonName] = parts;
              throw new UnprocessableEntityException(
                `lesson name already exits. (schoolId: ${schoolId}, termId: ${termId}, lessonName: ${lessonName})`,
              );
            }
          }
          throw new UnprocessableEntityException(
            '동일한 강좌명이 이미 존재합니다.',
          );
        }

        throw new UnprocessableEntityException('Invalid constraint');
      });

    //? 5단계) 반(Group)과 쌤(Sam) 정보 처리
    if (dto.groups?.length) {
      await this.processGroups(updatedLesson, dto, manager);
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
    dto: CreateLessonDto | UpdateLessonDto,
    // schoolId: number,
    // groups: CreateGroupWithInstructorDto[],
    manager: EntityManager,
  ): Promise<void> {
    const uniqueSams = new Map<string, number>(); // key: `${instructorName}-${instructorPhone}`
    const groupsWithSamData: GroupSamData[] = [];

    for (const groupDto of dto.groups || []) {
      const instructorPhone = normalizePhone(groupDto.instructorPhone || '');
      let instructorKey: string;
      let instructor: any;

      // 1. instructorId가 있으면 instructorId로 처리하고, 제공된 name/phone으로 업데이트
      if (groupDto.instructorId) {
        instructorKey = `id-${groupDto.instructorId}`;

        // 이미 처리한 강사인지 확인
        if (uniqueSams.has(instructorKey)) {
          const samId = uniqueSams.get(instructorKey)!;
          groupsWithSamData.push({
            lessonId: lesson.id,
            samId,
            ...groupDto,
          } as GroupSamData);
          continue;
        }

        // instructorId로 기존 instructor 찾기
        instructor = await manager.getRepository('Instructor').findOne({
          where: { id: groupDto.instructorId },
        });
        if (!instructor) {
          throw new NotFoundException(
            `Instructor with ID ${groupDto.instructorId} not found`,
          );
        }

        // 새로 제공된 name이나 phone이 있으면 업데이트
        let needsUpdate = false;
        if (
          groupDto.instructorName &&
          instructor.name !== groupDto.instructorName
        ) {
          instructor.name = groupDto.instructorName;
          needsUpdate = true;
        }
        if (groupDto.instructorPhone && instructor.phone !== instructorPhone) {
          instructor.phone = instructorPhone;
          needsUpdate = true;
        }

        if (needsUpdate) {
          instructor = await manager
            .getRepository('Instructor')
            .save(instructor);
        }
      } else {
        // 2. instructorId가 없으면 instructorPhone으로 처리
        if (!groupDto.instructorName || !groupDto.instructorPhone) {
          throw new Error(
            'instructorName and instructorPhone are required when instructorId is not provided',
          );
        }

        instructorKey = `${groupDto.instructorName}-${instructorPhone}`;

        // 이미 처리한 강사인지 확인
        if (uniqueSams.has(instructorKey)) {
          const samId = uniqueSams.get(instructorKey)!;
          groupsWithSamData.push({
            lessonId: lesson.id,
            samId,
            ...groupDto,
          } as GroupSamData);
          continue;
        }

        // instructorPhone으로 기존 instructor 찾기 또는 생성
        instructor = await manager.getRepository('Instructor').findOne({
          where: { phone: instructorPhone },
        });
        if (!instructor) {
          // 새 instructor 생성
          instructor = await manager.getRepository('Instructor').save({
            name: groupDto.instructorName,
            phone: groupDto.instructorPhone,
          });
        } else {
          // 기존 instructor가 있으면 이름을 업데이트
          if (instructor.name !== groupDto.instructorName) {
            instructor.name = groupDto.instructorName;
            instructor = await manager
              .getRepository('Instructor')
              .save(instructor);
          }
        }
      }

      if (!instructor || !instructor.id) {
        throw new Error('Failed to find or create Instructor');
      }

      // 3. Find or create Sam (by instructorId, schoolId)
      if (!dto.schoolId) {
        throw new Error('schoolId is required in DTO');
      }
      let sam = await manager.getRepository('Sam').findOne({
        where: { instructorId: instructor.id, schoolId: dto.schoolId },
      });
      if (!sam) {
        sam = await manager.getRepository('Sam').save({
          instructorId: instructor.id,
          schoolId: dto.schoolId,
          alias: groupDto.instructorName || instructor.name, // instructorName이 없으면 instructor.name 사용
        });
      } else {
        // 기존 sam이 있으면 alias를 업데이트 (instructorName이 제공된 경우)
        const newAlias = groupDto.instructorName || instructor.name;
        if (sam.alias !== newAlias) {
          sam.alias = newAlias;
          sam = await manager.getRepository('Sam').save(sam);
        }
      }
      if (!sam || !sam.id) {
        throw new Error('Failed to find or create Sam');
      }

      uniqueSams.set(instructorKey, Number(sam.id));
      groupsWithSamData.push({
        lessonId: lesson.id,
        samId: Number(sam.id),
        ...groupDto,
      } as GroupSamData);
    }

    // Upsert groups with both lessonId and samId
    for (const groupData of groupsWithSamData) {
      const groupStart = parseTimeFormat(parseTime(groupData.start));
      const groupEnd = parseTimeFormat(parseTime(groupData.end));
      const groupAllowedGrades = parseRangeFormat(
        groupData.allowedGrades as string,
      ).join(',');

      const upsertData: DeepPartial<Group> = {
        lessonId: groupData.lessonId,
        groupName: groupData.groupName,
        samId: groupData.samId,
        samName: groupData.instructorName, //! sam 의 name 추가
        location: groupData.location,
        capacity: groupData.capacity,
        allowedGrades: groupAllowedGrades,
        weekday: groupData.weekday,
        start: groupStart,
        end: groupEnd,
        tuition: groupData.tuition,
        bookFee: groupData.bookFee,
        materialFee: groupData.materialFee,
        status: groupData.status,
        note: groupData.note,
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

    // 저장된 groups 데이터가 lesson 객체에 반영되도록
    lesson.groups = await manager.find(Group, {
      where: { lessonId: lesson.id, deletedAt: IsNull() },
    });

    // Contract 관계를 정교하게 관리: 기존 데이터와 비교하여 정확한 처리
    await this.manageContracts(
      lesson.id,
      uniqueSams,
      lesson.groups,
      dto,
      lesson,
      manager,
    );
  }

  /**
   * Contract 관계를 정교하게 관리
   * - 기존 contracts와 새로운 계약을 비교하여 정확한 처리
   * - 새로운 contracts는 upsert
   * - 삭제된 sam이나 group과 연관된 기존 contracts는 삭제
   * - 데이터 정합성 보장 및 불필요한 작업 최소화
   */
  private async manageContracts(
    lessonId: number,
    uniqueSams: Map<string, number>,
    groups: Group[],
    dto: CreateLessonDto | UpdateLessonDto,
    lesson: Lesson,
    manager: EntityManager,
  ): Promise<void> {
    // 1. 기존 contracts 조회
    const existingContracts = await manager.getRepository(Contract).find({
      where: { lessonId },
      select: ['id', 'samId', 'groupId'],
    });

    // 2. 새로운 contract 데이터 생성
    const contractData: Array<{
      samId: number;
      lessonId: number;
      groupId: number;
      termId: number;
      start: string;
      end: string;
    }> = [];

    const samIds = Array.from(uniqueSams.values());
    for (const samId of samIds) {
      for (const group of groups) {
        contractData.push({
          samId,
          lessonId,
          groupId: group.id,
          termId: lesson.termId,
          start: dto.start ?? lesson.start,
          end: dto.end ?? lesson.end,
        });
      }
    }

    // 3. 새로운 contracts upsert
    if (contractData.length > 0) {
      const placeholders = contractData
        .map(() => '(?, ?, ?, ?, ?, ?)')
        .join(', ');
      const values = contractData.flatMap((data) => [
        data.samId,
        data.lessonId,
        data.groupId,
        data.termId,
        data.start,
        data.end,
      ]);

      const upsertQuery = `
        INSERT INTO contracts (samId, lessonId, groupId, termId, start, end)
        VALUES ${placeholders} AS new_contract(samId, lessonId, groupId, termId, start, end)
        ON DUPLICATE KEY UPDATE
          termId = new_contract.termId,
          start = new_contract.start,
          end = new_contract.end,
          updatedAt = CURRENT_TIMESTAMP
      `;
      await manager.query(upsertQuery, values);
    }

    // 4. 현재 유효한 sam-group 조합 생성
    const currentValidCombinations = new Set<string>();
    for (const samId of samIds) {
      for (const group of groups) {
        currentValidCombinations.add(`${samId}-${group.id}`);
      }
    }

    // 5. 삭제해야 할 기존 contracts 찾기
    const contractsToDelete = existingContracts.filter((contract) => {
      const combination = `${contract.samId}-${contract.groupId}`;
      return !currentValidCombinations.has(combination);
    });

    // 6. 불필요한 contracts 삭제
    if (contractsToDelete.length > 0) {
      const idsToDelete = contractsToDelete.map((contract) => contract.id);
      await manager.getRepository(Contract).delete(idsToDelete);
    }
  }
}
