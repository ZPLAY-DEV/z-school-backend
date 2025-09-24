import {
  BadRequestException,
  ConflictException,
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
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import {
  calculateLessonDays,
  generateSchooldays,
} from 'src/helpers/lesson-days.util';
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

  async create(
    school: School,
    term: Term,
    dto: CreateLessonDto,
  ): Promise<Lesson> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      //? 1. start/end 가 학기 기간 내에 있는지 확인
      const termStartDate = new Date(term.start);
      const termEndDate = new Date(term.end);
      const lessonStartDate = dto.start ? new Date(dto.start) : null;
      const lessonEndDate = dto.end ? new Date(dto.end) : null;

      // 날짜 범위 검증: lesson의 시작일이 term 범위를 벗어나거나, 종료일이 term 범위를 벗어나는 경우
      if (
        (lessonStartDate && lessonStartDate < termStartDate) ||
        (lessonEndDate && lessonEndDate > termEndDate) ||
        (lessonStartDate && lessonStartDate > termEndDate) ||
        (lessonEndDate && lessonEndDate < termStartDate)
      ) {
        console.log(
          `🥵 Term range: ${termStartDate.toISOString().split('T')[0]} ~ ${termEndDate.toISOString().split('T')[0]}, Lesson: ${dto.start || 'N/A'} ~ ${dto.end || 'N/A'}`,
        );
        throw new BadRequestException(
          `학기를 벗어난 날짜입니다. (${termStartDate.toISOString().split('T')[0]} ~ ${termEndDate.toISOString().split('T')[0]})`,
        );
      }

      //? 2. 같은 이름의 기존 강좌가 있는지 확인
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

      //? 3. 새로운 강좌 생성
      const createData = {
        ...dto,
        start: dto.start ?? term.start,
        end: term.end,
        schoolName: school.name,
        frequency: dto.frequency ?? 1,
        operationFeeRule: school.operationFeeRule,
      };
      const lesson = await manager.save(Lesson, createData).catch((error) => {
        console.log(
          `🔴 create 허용하지 않는 입력 조합 오류`,
          JSON.stringify(createData, null, 2),
          error,
        );

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
              throw new ConflictException(
                `Duplicate lesson name exits. (schoolId: ${schoolId}, termId: ${termId}, lessonName: ${lessonName})`,
              );
            }
          }
          throw new ConflictException('Duplicate entry exists.');
        }

        throw new UnprocessableEntityException('Invalid constraint');
      });

      //? 4. 반(Group)과 쌤(Sam) 정보 처리
      if (dto.groups?.length) {
        await this.processGroups(lesson, dto, manager);
      }

      //? 5. 최신 데이터로 schooldays(weekNumber포함) 처리
      const savedLesson = await manager.findOneOrFail(Lesson, {
        where: { id: lesson.id },
        relations: { groups: true, category: true },
      });
      await this.syncSchooldaysForLesson(savedLesson, manager, 'create');

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

    //? 1. 업데이트할 강좌 찾기
    const existingLesson = await manager.findOne(Lesson, {
      where: { id },
      relations: { groups: true, term: true },
    });
    if (!existingLesson) {
      throw new NotFoundException('Lesson not found');
    }

    //? 2. start/end 변경 여부 확인 (schooldays 재계산 조건)
    const isStartChanged =
      dto.start !== undefined && dto.start !== existingLesson.start;
    const isEndChanged =
      dto.end !== undefined && dto.end !== existingLesson.end;
    let needsSchooldaysUpdate = isStartChanged || isEndChanged;

    //? 3. Group 변경 사항도 확인 (요일, 시간 변경 시 schooldays 재계산 필요)
    let hasGroupScheduleChanges = false;
    if (dto.groups?.length) {
      hasGroupScheduleChanges = dto.groups.some((groupDto) => {
        const existingGroup = existingLesson.groups.find(
          (g) => g.groupName === groupDto.groupName || g.id === groupDto.id,
        );
        if (!existingGroup) return true; // 새로운 그룹 추가
        // 요일이나 시간 변경 여부 확인
        const weekdayChanged =
          groupDto.weekday !== undefined &&
          groupDto.weekday !== existingGroup.weekday;
        const startTimeChanged =
          groupDto.start !== undefined &&
          parseTimeFormat(parseTime(groupDto.start)) !== existingGroup.start;
        const endTimeChanged =
          groupDto.end !== undefined &&
          parseTimeFormat(parseTime(groupDto.end)) !== existingGroup.end;

        return weekdayChanged || startTimeChanged || endTimeChanged;
      });
    }

    needsSchooldaysUpdate = needsSchooldaysUpdate || hasGroupScheduleChanges;

    if (needsSchooldaysUpdate) {
      const reasons: string[] = [];
      if (isStartChanged)
        reasons.push(`start: ${existingLesson.start} → ${dto.start}`);
      if (isEndChanged) reasons.push(`end: ${existingLesson.end} → ${dto.end}`);
      if (hasGroupScheduleChanges) reasons.push('group schedule changes');

      this.logger.log(
        `😱 [update] Lesson #${id} schooldays recalculation needed - ${reasons.join(', ')}`,
      );
    }

    //? 1단계) 학교 정보 확인
    const school = await manager.findOne(School, {
      where: { id: dto.schoolId || existingLesson.schoolId },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }

    //? 2단계) 학기 정보 확인
    const term = await manager.findOne(Term, {
      where: { id: dto.termId || existingLesson.termId },
    });
    if (!term) {
      throw new NotFoundException('Term not found');
    }

    const termStartDate = new Date(term.start);
    const termEndDate = new Date(term.end);
    const lessonStartDate = dto.start ? new Date(dto.start) : null;
    const lessonEndDate = dto.end ? new Date(dto.end) : null;

    // 날짜 범위 검증: lesson의 시작일이 term 범위를 벗어나거나, 종료일이 term 범위를 벗어나는 경우
    if (
      (lessonStartDate && lessonStartDate < termStartDate) ||
      (lessonEndDate && lessonEndDate > termEndDate) ||
      (lessonStartDate && lessonStartDate > termEndDate) ||
      (lessonEndDate && lessonEndDate < termStartDate)
    ) {
      console.log(
        `🥵 Term range: ${termStartDate.toISOString().split('T')[0]} ~ ${termEndDate.toISOString().split('T')[0]}, Lesson: ${dto.start || 'N/A'} ~ ${dto.end || 'N/A'}`,
      );
      throw new BadRequestException(
        `학기를 벗어난 날짜입니다. (${termStartDate.toISOString().split('T')[0]} ~ ${termEndDate.toISOString().split('T')[0]})`,
      );
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

      // # 자동삭제 방지 - Lesson 업데이트 시 Group 자동 삭제는 위험하므로 비활성화
      // 업데이트 요청에 포함된 반ID 목록
      // const newGroupIds = dto.groups
      //   .filter((g) => g.id !== undefined)
      //   .map((g) => g.id);

      // 강좌의 모든 반 중에서 newGroupIds 에 미포함된 반ID 목록
      // const groupsToDelete = existingLesson.groups.filter(
      //   (group) => !newGroupIds.includes(group.id),
      // );

      // if (groupsToDelete.length > 0) {
      //   await manager.softDelete(
      //     Group,
      //     groupsToDelete.map((g) => g.id),
      //   );
      // }
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
        console.log(
          `🔴 update 허용하지 않는 입력 조합 오류`,
          JSON.stringify(updateData, null, 2),
          error,
        );

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
              throw new ConflictException(
                `duplicate lesson name exits. (schoolId: ${schoolId}, termId: ${termId}, lessonName: ${lessonName})`,
              );
            }
          }
          throw new ConflictException('Duplicate entry exists.');
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

    //? 6단계) 학업요일 days 정보 및 schooldays 처리
    if (needsSchooldaysUpdate) {
      try {
        await this.syncSchooldaysForLesson(finalLesson, manager, 'update');
        this.logger.log(
          `✅ [update] Successfully recalculated schooldays for lesson ${id}`,
        );
      } catch (error) {
        this.logger.error(
          `❌ [update] Failed to recalculate schooldays for lesson ${id}:`,
          error,
        );
        throw new BadRequestException(
          `Failed to update lesson schedule: ${error.message}`,
        );
      }

      //? 7단계) picks와 contracts 날짜 업데이트
      try {
        // picks의 end 날짜만 업데이트 (학생들의 수업 종료일)
        if (isEndChanged) {
          await this.updatePicksEndDate(finalLesson, manager, 'update');
        }

        // contracts의 start/end 날짜 업데이트 (강사들의 계약 기간)
        if (isStartChanged || isEndChanged) {
          await this.updateContractsDate(finalLesson, manager, 'update');
        }

        this.logger.log(
          `✅ [update] Successfully updated related picks and contracts for lesson ${id}`,
        );
      } catch (error) {
        this.logger.error(
          `❌ [update] Failed to update picks/contracts for lesson ${id}:`,
          error,
        );
        throw new BadRequestException(
          `Failed to update related picks/contracts: ${error.message}`,
        );
      }
    }

    return finalLesson;
  }

  //? ---------------------------------------------------------------------- ?//
  //? PUBLIC METHODS FOR SCHOOLDAYS SYNC
  //? ---------------------------------------------------------------------- ?//

  /**
   * 강좌의 schooldays를 동기화합니다 (외부 호출용)
   * 트랜잭션 컨텍스트를 생성하여 내부 private 메서드를 호출합니다.
   */
  async syncSchooldaysForLessonById(lessonId: number): Promise<void> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const lesson = await manager.findOneOrFail(Lesson, {
        where: { id: lessonId },
        relations: { groups: true },
      });

      await this.syncSchooldaysForLesson(lesson, manager, 'external');
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? HELPER METHODS
  //? ---------------------------------------------------------------------- ?//

  /**
   * lesson의 그룹들과 연결된 picks의 end 날짜를 업데이트합니다.
   */
  private async updatePicksEndDate(
    lesson: Lesson,
    manager: EntityManager,
    context: string = 'lesson-update',
  ): Promise<void> {
    const groupIds = lesson.groups.map((group) => group.id);

    if (groupIds.length === 0) {
      this.logger.log(
        `⏭️ [${context}] No groups found for lesson ${lesson.id}, skipping picks update`,
      );
      return;
    }

    this.logger.log(
      `🔄 [${context}] Updating picks end date for lesson ${lesson.id} groups: [${groupIds.join(', ')}]`,
    );

    try {
      const result = await manager
        .createQueryBuilder()
        .update(Pick)
        .set({
          end: lesson.end,
        })
        .where('groupId IN (:...groupIds)', { groupIds })
        .andWhere('isActive = :isActive', { isActive: true })
        .execute();

      this.logger.log(
        `✅ [${context}] Updated ${result.affected} active picks with new end date: ${lesson.end}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ [${context}] Failed to update picks end date for lesson ${lesson.id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * lesson의 그룹들과 연결된 contracts의 start/end 날짜를 업데이트합니다.
   */
  private async updateContractsDate(
    lesson: Lesson,
    manager: EntityManager,
    context: string = 'lesson-update',
  ): Promise<void> {
    const groupIds = lesson.groups.map((group) => group.id);

    if (groupIds.length === 0) {
      this.logger.log(
        `⏭️ [${context}] No groups found for lesson ${lesson.id}, skipping contracts update`,
      );
      return;
    }

    this.logger.log(
      `🔄 [${context}] Updating contracts dates for lesson ${lesson.id} groups: [${groupIds.join(', ')}]`,
    );

    try {
      const result = await manager
        .createQueryBuilder()
        .update(Contract)
        .set({
          start: lesson.start,
          end: lesson.end,
        })
        .where('groupId IN (:...groupIds)', { groupIds })
        .execute();

      this.logger.log(
        `✅ [${context}] Updated ${result.affected} contracts with new dates: ${lesson.start} ~ ${lesson.end}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ [${context}] Failed to update contracts dates for lesson ${lesson.id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * 강좌의 그룹들에 대해 schooldays를 동기화합니다.
   * 기존 schooldays와 새로 생성될 schooldays를 비교하여
   * 추가/삭제/업데이트를 수행합니다.
   */
  private async syncSchooldaysForLesson(
    lesson: Lesson,
    manager: EntityManager,
    context: string = 'sync',
  ): Promise<void> {
    this.logger.log(
      `🔄 [${context}] Processing schooldays for lesson ${lesson.id} with ${lesson.groups.length} groups`,
    );

    // offdays 정보 조회 (lesson 단위로 캐싱)
    const offdays: string[] = await this.calendarService.findByDateRange(
      lesson.schoolId,
      lesson.start,
      lesson.end,
    );

    // lesson 정보 캐싱 (term 포함)
    const lessonWithTerm = await manager.findOne(Lesson, {
      where: { id: lesson.id },
      relations: ['term'],
    });

    for (const group of lesson.groups) {
      try {
        this.logger.log(
          `📝 [${context}] Processing schooldays for group ${group.id} (${group.groupName})`,
        );

        // 1. 기존 schooldays 조회 및 검증
        const existingSchooldays = await manager.getRepository(Schoolday).find({
          where: { groupId: group.id },
          select: [
            'id',
            'schoolId',
            'termId',
            'lessonId',
            'groupId',
            'name',
            'startsAt',
            'endsAt',
            'weekNumber',
          ],
        });

        this.logger.log(
          `📊 [${context}] Found ${existingSchooldays.length} existing schooldays for group ${group.id}`,
        );

        // 2. 기존 schooldays를 key-value로 변환 (unique constraint 기준)
        const existingMap = new Map<string, Schoolday>();
        for (const sd of existingSchooldays) {
          if (
            !sd.schoolId ||
            !sd.termId ||
            !sd.lessonId ||
            !sd.groupId ||
            !sd.startsAt ||
            !sd.endsAt
          ) {
            this.logger.warn(
              `⚠️ [${context}] Invalid schoolday data found: ${JSON.stringify(sd)}`,
            );
            continue;
          }
          const key = `${sd.schoolId}|${sd.termId}|${sd.lessonId}|${sd.groupId}|${sd.name || ''}|${sd.startsAt.toISOString()}|${sd.endsAt.toISOString()}`;
          existingMap.set(key, sd);
        }

        // 3. 새로 생성될 schooldays 생성 및 검증
        this.logger.log(
          `🆕 [${context}] Generating new schooldays for lesson ${lesson.lessonName}, group ${group.groupName}`,
        );
        const newSchooldays: Schoolday[] = generateSchooldays(
          lesson,
          group,
          offdays,
        );

        if (!newSchooldays || newSchooldays.length === 0) {
          this.logger.warn(
            `⚠️ [${context}] No schooldays generated for group ${group.id}. This might indicate an issue with lesson schedule.`,
          );
          group.days = 0;
          await manager.save(group);
          continue;
        }

        this.logger.log(
          `📊 [${context}] Generated ${newSchooldays.length} new schooldays for group ${group.id}`,
        );

        // 4. 새로운 schooldays를 key-value로 변환 및 검증
        const newMap = new Map<string, Schoolday>();
        for (const sd of newSchooldays) {
          if (
            !sd.schoolId ||
            !sd.termId ||
            !sd.lessonId ||
            !sd.groupId ||
            !sd.startsAt ||
            !sd.endsAt
          ) {
            this.logger.error(
              `❌ [${context}] Invalid generated schoolday: ${JSON.stringify(sd)}`,
            );
            throw new Error(
              `Invalid schoolday generated for group ${group.id}`,
            );
          }
          const key = `${sd.schoolId}|${sd.termId}|${sd.lessonId}|${sd.groupId}|${sd.name || ''}|${sd.startsAt.toISOString()}|${sd.endsAt.toISOString()}`;
          newMap.set(key, sd);
        }

        // 5. 차이점 계산
        const toInsert = Array.from(newMap.entries())
          .filter(([key]) => !existingMap.has(key))
          .map(([, sd]) => sd);

        const toDelete = Array.from(existingMap.entries())
          .filter(([key]) => !newMap.has(key))
          .map(([, sd]) => sd);

        this.logger.log(
          `📊 [${context}] Group ${group.id}: ${toInsert.length} to insert, ${toDelete.length} to delete`,
        );

        // 6. 삭제 작업 (먼저 실행)
        if (toDelete.length > 0) {
          this.logger.log(
            `🗑️ [${context}] Deleting ${toDelete.length} schooldays for group ${group.id}`,
          );
          try {
            await manager
              .getRepository(Schoolday)
              .delete(toDelete.map((sd) => sd.id));
            this.logger.log(
              `✅ [${context}] Successfully deleted ${toDelete.length} schooldays for group ${group.id}`,
            );
          } catch (deleteError) {
            this.logger.error(
              `❌ [${context}] Failed to delete  for group ${group.id}:`,
              deleteError,
            );
            throw new Error(
              `Failed to delete existing schooldays for group ${group.id}: ${deleteError.message}`,
            );
          }
        }

        // 7. 삽입 작업
        if (toInsert.length > 0) {
          this.logger.log(
            `➕ [${context}] Inserting ${toInsert.length} schooldays for group ${group.id}`,
          );
          try {
            // 각 schoolday의 데이터 무결성 최종 검증
            for (const schoolday of toInsert) {
              if (!schoolday.groupId || schoolday.groupId !== group.id) {
                this.logger.error(
                  `❌ [${context}] Invalid groupId in schoolday: expected ${group.id}, got ${schoolday.groupId}`,
                );
                schoolday.groupId = group.id; // 강제 수정
              }
            }

            await manager
              .getRepository(Schoolday)
              .upsert(toInsert, ['schoolId', 'termId', 'lessonId', 'groupId']);
            this.logger.log(
              `✅ [${context}] Successfully inserted ${toInsert.length} schooldays for group ${group.id}`,
            );
          } catch (insertError) {
            this.logger.error(
              `❌ [${context}] Failed to insert schooldays for group ${group.id}:`,
              insertError,
            );
            throw new Error(
              `Failed to insert new schooldays for group ${group.id}: ${insertError.message}`,
            );
          }
        }

        // 8. group.days 갱신
        const finalDaysCount = newSchooldays.length;
        if (group.days !== finalDaysCount) {
          this.logger.log(
            `📊 [${context}] Updating group ${group.id} days: ${group.days} -> ${finalDaysCount}`,
          );
          group.days = finalDaysCount;
          await manager.save(group);
        }

        this.logger.log(
          `✅ [${context}] Successfully processed schooldays for group ${group.id}: ${finalDaysCount} total days`,
        );

        // 9. weekNumber 재넘버링 (schooldays 생성/수정 후) - 캐시된 데이터 전달
        await this.renumberWeekNumbersForGroup(
          group,
          manager,
          lessonWithTerm || undefined,
          offdays,
        );
      } catch (error) {
        this.logger.error(
          `❌ [${context}] Error processing schooldays for group ${group.id}:`,
          error,
        );
        throw new Error(
          `Failed to process schooldays for group ${group.id}: ${error.message}`,
        );
      }
    }
  }

  /**
   * 특정 group의 schooldays weekNumber를 재넘버링 (연휴를 건너뛰고 연속적으로) - 최적화 버전
   */
  private async renumberWeekNumbersForGroup(
    group: Group,
    manager: EntityManager,
    cachedLesson?: Lesson,
    cachedOffdays?: string[],
  ): Promise<void> {
    try {
      // 1. 캐시된 데이터 사용 또는 새로 조회
      const lesson =
        cachedLesson ||
        (await manager.findOne(Lesson, {
          where: { id: group.lessonId },
          relations: ['term'],
        }));

      if (!lesson) {
        this.logger.error(`❌ Lesson not found for group ${group.id}`);
        return;
      }

      const offdays =
        cachedOffdays ||
        (await this.calendarService.findByDateRange(
          lesson.schoolId,
          lesson.start,
          lesson.end,
        ));

      // 2. calendarDays 생성 (연휴 정보 포함)
      const calendarDays = calculateLessonDays(lesson, group, offdays);

      // 3. 연휴를 건너뛰고 연속적인 weekNumber 부여
      // 최신 schooldays를 DB에서 직접 조회
      const sortedSchooldays = await manager.getRepository(Schoolday).find({
        where: { groupId: group.id },
        order: { startsAt: 'ASC' },
      });

      this.logger.log(
        `🔍 [DEBUG] Found ${sortedSchooldays.length} schooldays for group ${group.id}`,
      );

      // calendarDays에서 isClassDay가 true인 날짜들만 weekNumber 부여
      // 공휴일은 주차 계산에서 제외하고 연속적으로 번호 부여
      const classDays = calendarDays.filter((day) => day.isClassDay);

      // 검증: classDays와 sortedSchooldays의 개수가 같아야 함
      if (classDays.length !== sortedSchooldays.length) {
        this.logger.warn(
          `⚠️ Mismatch between classDays (${classDays.length}) and sortedSchooldays (${sortedSchooldays.length}) for group ${group.id}`,
        );
      }

      // 4. 연속적인 weekNumber 부여 (1부터 시작) - Bulk Update
      const schooldaysToUpdate = sortedSchooldays
        .filter((schoolday) => schoolday.startsAt)
        .map((schoolday, index) => ({
          id: schoolday.id,
          weekNumber: index + 1,
        }));

      if (schooldaysToUpdate.length > 0) {
        // 더 효율적인 Bulk update - CASE WHEN 사용
        const caseWhenClause = schooldaysToUpdate
          .map(({ id, weekNumber }) => `WHEN id = ${id} THEN ${weekNumber}`)
          .join(' ');

        await manager
          .createQueryBuilder()
          .update(Schoolday)
          .set({ weekNumber: () => `CASE ${caseWhenClause} END` })
          .whereInIds(schooldaysToUpdate.map((s) => s.id))
          .execute();

        this.logger.log(
          `🔍 [DEBUG] Bulk updated ${schooldaysToUpdate.length} schooldays for group ${group.id}`,
        );
      }

      this.logger.log(
        `✅ Renumbered ${schooldaysToUpdate.length} schooldays for group ${group.id} (continuous weekNumber)`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to renumber weekNumbers for group ${group.id}:`,
        error,
      );
      throw error;
    }
  }

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
        instructorKey = `${groupDto.instructorName || ''}-${instructorPhone}`;

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
          // 새 instructor 생성 - normalize된 전화번호 사용
          instructor = await manager.getRepository('Instructor').save({
            name: groupDto.instructorName,
            phone: instructorPhone,
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
        termId: lesson.termId,
        lessonId: lesson.id,
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

    // # 자동삭제 방지 - Lesson 업데이트 시 Group 자동 삭제는 위험하므로 비활성화
    // 전달된 DTO에 없는 기존 그룹 찾아서 삭제하기
    // const existingLesson = await manager.findOne(Lesson, {
    //   where: { id: lesson.id },
    //   relations: { groups: true },
    // });
    // if (existingLesson && existingLesson.groups.length > 0) {
    //   const newGroupNames = dto.groups?.map((g) => g.groupName || '') || [];
    //   const groupsToDelete = existingLesson.groups.filter(
    //     (g) => !newGroupNames.includes(g.groupName || ''),
    //   );
    //   if (groupsToDelete.length > 0) {
    //     await manager.softDelete(
    //       Group,
    //       groupsToDelete.map((g) => g.id),
    //     );
    //   }
    // }

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
