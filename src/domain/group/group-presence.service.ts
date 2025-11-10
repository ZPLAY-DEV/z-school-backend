import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PresenceStatus } from 'src/common/enums';
import { StudentPresence } from 'src/common/interfaces';
import { Departure } from 'src/domain/departure/entities/departure.entity';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { CreatePresenceDto } from 'src/domain/presence/dto/create-presence.dto';
import { Presence } from 'src/domain/presence/entities/presence.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Repository } from 'typeorm';

@Injectable()
export class GroupPresenceService {
  private readonly logger = new Logger(GroupPresenceService.name);

  constructor(
    @InjectRepository(Pick)
    private readonly pickRepository: Repository<Pick>,
    @InjectRepository(Schoolday)
    private readonly schooldayRepository: Repository<Schoolday>,
    @InjectRepository(Departure)
    private readonly departureRepository: Repository<Departure>,
    @InjectRepository(Presence)
    private readonly presenceRepository: Repository<Presence>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create 또는 Update
  //? ---------------------------------------------------------------------- ?//

  async upsert(dto: CreatePresenceDto): Promise<Presence> {
    const { groupId, studentId, week, lessonDate, status, note } = dto;

    if (!groupId || !studentId) {
      throw new BadRequestException('groupId와 studentId는 필수입니다.');
    }

    if (!Number.isInteger(week) || week < 1) {
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
      week,
      lessonDate: typeof lessonDate === 'string' ? lessonDate : null,
      status: status as unknown as PresenceStatus,
      note: typeof note === 'string' ? note : null,
    };

    const presence =
      (await this.presenceRepository.findOne({
        where: { pickId: pick.id, week },
      })) ?? this.presenceRepository.create(payload);

    Object.assign(presence, payload);

    return await this.presenceRepository.save(presence);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async findByWeek(
    groupId: number,
    week: number,
    filters: { studentId?: number; userId?: number } = {},
  ): Promise<StudentPresence[]> {
    if (!Number.isInteger(week) || week < 1) {
      throw new BadRequestException('주차는 1 이상의 정수여야 합니다.');
    }

    const { studentId, userId } = filters;

    const schoolday = await this.schooldayRepository.findOne({
      where: { groupId, weekNumber: week },
      order: { today: 'ASC' },
    });

    const query = this.pickRepository
      .createQueryBuilder('pick')
      .innerJoinAndSelect('pick.student', 'student')
      .leftJoin('student.parent', 'parent')
      .leftJoinAndSelect(
        'pick.presences',
        'presence',
        'presence.week = :week',
        { week },
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
        pick.presences?.find((item) => item.week === week) ??
        pick.presences?.[0];

      return {
        week,
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
      } satisfies StudentPresence;
    });
  }

  async findByStudent(
    groupId: number,
    studentId: number,
    week?: number,
  ): Promise<StudentPresence[]> {
    if (typeof week === 'number') {
      if (!Number.isInteger(week) || week < 1) {
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
      if (typeof week === 'number' && record.weekNumber !== week) {
        continue;
      }
      if (!schooldayMap.has(record.weekNumber)) {
        schooldayMap.set(record.weekNumber, record.today);
      }
    }

    const presenceWhere: { pickId: number; week?: number } = {
      pickId: pick.id,
    };

    if (typeof week === 'number') {
      presenceWhere.week = week;
    }

    const presences = await this.presenceRepository.find({
      where: presenceWhere,
      order: { week: 'ASC', lessonDate: 'ASC' },
    });

    const presenceMap = new Map<number, Presence>();
    for (const presence of presences) {
      if (!presenceMap.has(presence.week)) {
        presenceMap.set(presence.week, presence);
      }
    }

    const baseWeeks =
      typeof week === 'number'
        ? presenceMap.has(week) || schooldayMap.has(week)
          ? [week]
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
        week: weekNumber,
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
      } satisfies StudentPresence;
    });
  }
}
