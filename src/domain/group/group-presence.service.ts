import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PresenceStatus } from 'src/common/enums';
import { IStudentPresence } from 'src/common/interfaces';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { CreatePresenceDto } from 'src/domain/presence/dto/create-presence.dto';
import { Presence } from 'src/domain/presence/entities/presence.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class GroupPresenceService {
  private readonly logger = new Logger(GroupPresenceService.name);

  constructor(
    @InjectRepository(Pick)
    private readonly pickRepository: Repository<Pick>,
    @InjectRepository(Schoolday)
    private readonly schooldayRepository: Repository<Schoolday>,
    @InjectRepository(Presence)
    private readonly presenceRepository: Repository<Presence>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create 또는 Update
  //? ---------------------------------------------------------------------- ?//

  async upsertBulk(dtos: CreatePresenceDto[]): Promise<Presence[]> {
    if (!Array.isArray(dtos) || dtos.length === 0) {
      throw new BadRequestException('출석 정보 배열이 필요합니다.');
    }

    // 모든 DTO에 대해 기본 검증
    for (const dto of dtos) {
      if (!dto.groupId || !dto.studentId) {
        throw new BadRequestException('groupId와 studentId는 필수입니다.');
      }

      if (
        !dto.weekNumber ||
        !Number.isInteger(dto.weekNumber) ||
        dto.weekNumber < 1
      ) {
        throw new BadRequestException('주차는 1 이상의 정수여야 합니다.');
      }
    }

    // 모든 studentId를 수집하여 한 번에 Pick 조회 (성능 최적화)
    const studentIds = [...new Set(dtos.map((dto) => dto.studentId))];
    const groupId = dtos[0].groupId; // 모든 DTO는 같은 groupId를 가져야 함

    // 모든 DTO가 같은 groupId를 가지는지 확인
    if (!dtos.every((dto) => dto.groupId === groupId)) {
      throw new BadRequestException(
        '모든 출석 정보는 같은 groupId를 가져야 합니다.',
      );
    }

    const picks = await this.pickRepository.find({
      where: {
        groupId,
        studentId: In(studentIds),
      },
    });

    // Pick이 없는 studentId 확인
    const foundStudentIds = new Set(picks.map((pick) => pick.studentId));
    const missingStudentIds = studentIds.filter(
      (id) => !foundStudentIds.has(id),
    );

    if (missingStudentIds.length > 0) {
      this.logger.warn(
        `Pick not found for groupId=${groupId}, studentIds=[${missingStudentIds.join(', ')}]`,
      );
      throw new NotFoundException(
        `해당 반에서 학생을 찾을 수 없습니다: studentIds=[${missingStudentIds.join(', ')}]`,
      );
    }

    // Pick을 studentId로 매핑
    const pickMap = new Map<number, Pick>();
    for (const pick of picks) {
      pickMap.set(pick.studentId, pick);
    }

    // 모든 pickId와 week 조합으로 기존 Presence 조회 (성능 최적화)
    const pickIds = picks.map((pick) => pick.id);
    const weeks = [...new Set(dtos.map((dto) => dto.weekNumber))];

    const existingPresences = await this.presenceRepository.find({
      where: {
        pickId: In(pickIds),
        weekNumber: In(weeks),
      },
    });

    // Presence를 (pickId, week) 키로 매핑
    const presenceMap = new Map<string, Presence>();
    for (const presence of existingPresences) {
      const key = `${presence.pickId}-${presence.weekNumber}`;
      presenceMap.set(key, presence);
    }

    // 각 DTO에 대해 Presence 생성 또는 업데이트
    const presencesToSave: Presence[] = [];

    for (const dto of dtos) {
      const pick = pickMap.get(dto.studentId);
      if (!pick) {
        continue; // 이미 위에서 검증했지만 안전장치
      }

      const key = `${pick.id}-${dto.weekNumber}`;
      const existingPresence = presenceMap.get(key);

      const payload: Partial<Presence> = {
        pickId: pick.id,
        weekNumber: dto.weekNumber,
        lessonDate: typeof dto.lessonDate === 'string' ? dto.lessonDate : null,
        status: dto.status as unknown as PresenceStatus,
        note: typeof dto.note === 'string' ? dto.note : null,
      };

      const presence = existingPresence
        ? Object.assign(existingPresence, payload)
        : this.presenceRepository.create(payload);

      presencesToSave.push(presence);
    }

    return await this.presenceRepository.save(presencesToSave);
  }

  async upsert(dto: CreatePresenceDto): Promise<Presence> {
    const { groupId, studentId, weekNumber, lessonDate, status, note } = dto;

    if (!groupId || !studentId) {
      throw new BadRequestException('groupId와 studentId는 필수입니다.');
    }

    if (!Number.isInteger(weekNumber) || weekNumber < 1) {
      throw new BadRequestException('주차는 1 이상의 정수여야 합니다.');
    }

    let pick: Pick;
    try {
      pick = await this.pickRepository.findOneOrFail({
        where: { groupId, studentId },
      });
    } catch (error) {
      this.logger.warn(
        `Pick not found for groupId=${groupId}, studentId=${studentId}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new NotFoundException('해당 반에서 학생을 찾을 수 없습니다.');
    }

    const payload: Partial<Presence> = {
      pickId: pick.id,
      weekNumber,
      lessonDate: typeof lessonDate === 'string' ? lessonDate : null,
      status: status as unknown as PresenceStatus,
      note: typeof note === 'string' ? note : null,
    };

    const presence =
      (await this.presenceRepository.findOne({
        where: { pickId: pick.id, weekNumber },
      })) ?? this.presenceRepository.create(payload);

    Object.assign(presence, payload);

    return await this.presenceRepository.save(presence);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async findByWeek(
    groupId: number,
    weekNumber: number,
    filters: { studentId?: number; userId?: number } = {},
  ): Promise<IStudentPresence[]> {
    if (!Number.isInteger(weekNumber) || weekNumber < 1) {
      throw new BadRequestException('주차는 1 이상의 정수여야 합니다.');
    }

    const { studentId, userId } = filters;

    const schoolday = await this.schooldayRepository.findOne({
      where: { groupId, weekNumber: weekNumber },
      order: { today: 'ASC' },
    });

    const query = this.pickRepository
      .createQueryBuilder('pick')
      .innerJoinAndSelect('pick.student', 'student')
      .leftJoin('student.parent', 'parent')
      .leftJoinAndSelect(
        'pick.presences',
        'presence',
        'presence.weekNumber = :weekNumber',
        { weekNumber },
      )
      .where('pick.groupId = :groupId', { groupId });

    if (typeof studentId === 'number') {
      query.andWhere('pick.studentId = :studentId', { studentId });
    }

    if (typeof userId === 'number') {
      query.andWhere('parent.userId = :userId', { userId });
    }

    const picks = await query.orderBy('student.name', 'ASC').getMany();

    const fallbackDate = schoolday?.today ?? '';

    return picks.map((pick) => {
      const presence =
        pick.presences?.find((item) => item.weekNumber === weekNumber) ??
        pick.presences?.[0];

      return {
        weekNumber,
        lessonDate: presence?.lessonDate ?? fallbackDate,
        index: pick.index,
        studentId: pick.studentId,
        studentName: pick.student?.name ?? '',
        isActive: pick.isActive,
        grade: pick.student?.grade ?? 0,
        klass: pick.student?.klass ?? '',
        bunho: pick.student?.bunho ?? 0,
        status: presence?.status ?? PresenceStatus.INIT,
        note: presence?.note ?? null,
      } satisfies IStudentPresence;
    });
  }

  async findByStudent(
    groupId: number,
    studentId: number,
    weekNumber?: number,
  ): Promise<IStudentPresence[]> {
    if (typeof weekNumber === 'number') {
      if (!Number.isInteger(weekNumber) || weekNumber < 1) {
        throw new BadRequestException('주차는 1 이상의 정수여야 합니다.');
      }
    }

    const pick = await this.pickRepository.findOne({
      where: { groupId, studentId },
      relations: ['student'],
    });

    if (!pick) {
      throw new NotFoundException('해당 반에서 학생을 찾을 수 없습니다.');
    }

    const schooldays = await this.schooldayRepository.find({
      where: { groupId },
      order: { weekNumber: 'ASC', today: 'ASC' },
    });

    const schooldayMap = new Map<number, string>();
    for (const record of schooldays) {
      if (typeof weekNumber === 'number' && record.weekNumber !== weekNumber) {
        continue;
      }
      if (!schooldayMap.has(record.weekNumber)) {
        schooldayMap.set(record.weekNumber, record.today);
      }
    }

    const presenceWhere: { pickId: number; weekNumber?: number } = {
      pickId: pick.id,
    };

    if (typeof weekNumber === 'number') {
      presenceWhere.weekNumber = weekNumber;
    }

    const presences = await this.presenceRepository.find({
      where: presenceWhere,
      order: { weekNumber: 'ASC', lessonDate: 'ASC' },
    });

    const presenceMap = new Map<number, Presence>();
    for (const presence of presences) {
      if (!presenceMap.has(presence.weekNumber)) {
        presenceMap.set(presence.weekNumber, presence);
      }
    }

    const baseWeeks =
      typeof weekNumber === 'number'
        ? presenceMap.has(weekNumber) || schooldayMap.has(weekNumber)
          ? [weekNumber]
          : []
        : Array.from(
            new Set([...schooldayMap.keys(), ...presenceMap.keys()]),
          ).sort((a, b) => a - b);

    if (!baseWeeks.length) {
      return [];
    }

    return baseWeeks.map((weekNumber) => {
      const presence = presenceMap.get(weekNumber);
      const date = presence?.lessonDate ?? schooldayMap.get(weekNumber) ?? '';
      return {
        weekNumber: weekNumber,
        lessonDate: date,
        index: pick.index,
        studentId: pick.studentId,
        studentName: pick.student?.name ?? '',
        isActive: pick.isActive,
        grade: pick.student?.grade ?? 0,
        klass: pick.student?.klass ?? '',
        bunho: pick.student?.bunho ?? 0,
        status: presence?.status ?? PresenceStatus.INIT,
        note: presence?.note ?? null,
      } satisfies IStudentPresence;
    });
  }
}

