import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IStudentScore } from 'src/common/interfaces';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { CreateScoreDto } from 'src/domain/score/dto/create-score.dto';
import { Score } from 'src/domain/score/entities/score.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class GroupScoreService {
  private readonly logger = new Logger(GroupScoreService.name);

  constructor(
    @InjectRepository(Pick)
    private readonly pickRepository: Repository<Pick>,
    @InjectRepository(Schoolday)
    private readonly schooldayRepository: Repository<Schoolday>,
    @InjectRepository(Score)
    private readonly scoreRepository: Repository<Score>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create 또는 Update
  //? ---------------------------------------------------------------------- ?//

  async upsertBulk(
    dtos: (CreateScoreDto & {
      groupId: number;
      studentId: number;
      weekNumber: number;
    })[],
  ): Promise<Score[]> {
    if (!Array.isArray(dtos) || dtos.length === 0) {
      throw new BadRequestException('점수 정보 배열이 필요합니다.');
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
        '모든 점수 정보는 같은 groupId를 가져야 합니다.',
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

    // 모든 pickId와 week 조합으로 기존 Score 조회 (성능 최적화)
    const pickIds = picks.map((pick) => pick.id);
    const weeks = [...new Set(dtos.map((dto) => dto.weekNumber))];

    const existingScores = await this.scoreRepository.find({
      where: {
        pickId: In(pickIds),
        weekNumber: In(weeks),
      },
    });

    // Score를 (pickId, week) 키로 매핑
    const scoreMap = new Map<string, Score>();
    for (const score of existingScores) {
      const key = `${score.pickId}-${score.weekNumber}`;
      scoreMap.set(key, score);
    }

    // 각 DTO에 대해 Score 생성 또는 업데이트
    const scoresToSave: Score[] = [];

    for (const dto of dtos) {
      const pick = pickMap.get(dto.studentId);
      if (!pick) {
        continue; // 이미 위에서 검증했지만 안전장치
      }

      const key = `${pick.id}-${dto.weekNumber}`;
      const existingScore = scoreMap.get(key);

      const payload: Partial<Score> = {
        pickId: pick.id,
        weekNumber: dto.weekNumber,
        lessonDate: typeof dto.lessonDate === 'string' ? dto.lessonDate : null,
        value: dto.value,
        note: typeof dto.note === 'string' ? dto.note : null,
      };

      const score = existingScore
        ? Object.assign(existingScore, payload)
        : this.scoreRepository.create(payload);

      scoresToSave.push(score);
    }

    return await this.scoreRepository.save(scoresToSave);
  }

  async upsert(
    dto: CreateScoreDto & {
      groupId: number;
      studentId: number;
      weekNumber: number;
    },
  ): Promise<Score> {
    const { groupId, studentId, weekNumber, lessonDate, value, note } = dto;

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

    const payload: Partial<Score> = {
      pickId: pick.id,
      weekNumber,
      lessonDate: typeof lessonDate === 'string' ? lessonDate : null,
      value,
      note: typeof note === 'string' ? note : null,
    };

    const score =
      (await this.scoreRepository.findOne({
        where: { pickId: pick.id, weekNumber },
      })) ?? this.scoreRepository.create(payload);

    Object.assign(score, payload);

    return await this.scoreRepository.save(score);
  }

  async findByWeek(
    groupId: number,
    weekNumber: number,
    filters: { studentId?: number; userId?: number } = {},
  ): Promise<IStudentScore[]> {
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
        'pick.scores',
        'score',
        'score.weekNumber = :weekNumber',
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
      const score =
        pick.scores?.find((item) => item.weekNumber === weekNumber) ??
        pick.scores?.[0];

      const value = score?.value ?? {
        game: {
          primary: 0,
          secondary: 0,
        },
        result: {
          primary: 0,
          secondary: 0,
        },
        measurement: {
          height: 0,
          weight: 0,
        },
      };

      return {
        weekNumber,
        lessonDate: score?.lessonDate ?? fallbackDate,
        index: pick.index,
        studentId: pick.studentId,
        studentName: pick.student?.name ?? '',
        isActive: pick.isActive,
        grade: pick.student?.grade ?? 0,
        klass: pick.student?.klass ?? '',
        bunho: pick.student?.bunho ?? 0,
        value: value,
        note: score?.note ?? null,
      } satisfies IStudentScore;
    });
  }

  /**
   * 특정 그룹의 특정 학생 점수 조회
   * @param groupId - 그룹(반) ID
   * @param studentId - 학생 ID
   * @param monthStr - 월 (YYYY-MM)
   * @returns 주차별로 정렬된 점수 목록
   */
  async findByStudent(
    groupId: number,
    studentId: number,
    weekNumber?: number,
  ): Promise<IStudentScore[]> {
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

    const scoreWhere: { pickId: number; weekNumber?: number } = {
      pickId: pick.id,
    };

    if (typeof weekNumber === 'number') {
      scoreWhere.weekNumber = weekNumber;
    }

    const scores = await this.scoreRepository.find({
      where: scoreWhere,
      order: { weekNumber: 'ASC', lessonDate: 'ASC' },
    });

    const scoreMap = new Map<number, Score>();
    for (const score of scores) {
      if (!scoreMap.has(score.weekNumber)) {
        scoreMap.set(score.weekNumber, score);
      }
    }

    const baseWeeks =
      typeof weekNumber === 'number'
        ? scoreMap.has(weekNumber) || schooldayMap.has(weekNumber)
          ? [weekNumber]
          : []
        : Array.from(
            new Set([...schooldayMap.keys(), ...scoreMap.keys()]),
          ).sort((a, b) => a - b);

    if (!baseWeeks.length) {
      return [];
    }

    return baseWeeks.map((weekNumber) => {
      const score = scoreMap.get(weekNumber);
      const value = score?.value ?? {
        game: {
          primary: 0,
          secondary: 0,
        },
        result: {
          primary: 0,
          secondary: 0,
        },
        measurement: {
          height: 0,
          weight: 0,
        },
      };
      const date = score?.lessonDate ?? schooldayMap.get(weekNumber) ?? '';
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
        value: value,
        note: score?.note ?? null,
      } satisfies IStudentScore;
    });
  }
}
