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
import { Score } from 'src/domain/score/entities/score.entity';
import { Repository } from 'typeorm';

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
          record1: 0,
          record2: 0,
          record3: 0,
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
