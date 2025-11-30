import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Score } from 'src/domain/score/entities/score.entity';
import { Repository } from 'typeorm';

@Injectable()
export class GroupScoreService {
  private readonly logger = new Logger(GroupScoreService.name);

  constructor(
    @InjectRepository(Score)
    private readonly scoreRepository: Repository<Score>,
  ) {}

  /**
   * 특정 그룹의 특정 학생 점수 조회
   * @param groupId - 그룹(반) ID
   * @param studentId - 학생 ID
   * @returns 주차별로 정렬된 점수 목록
   */
  async getStudentScores(groupId: number, studentId: number): Promise<Score[]> {
    return await this.scoreRepository
      .createQueryBuilder('score')
      .innerJoin('score.pick', 'pick')
      .where('pick.groupId = :groupId', { groupId })
      .andWhere('pick.studentId = :studentId', { studentId })
      .andWhere('pick.isActive = :isActive', { isActive: true })
      .orderBy('score.weekNumber', 'ASC')
      .addOrderBy('score.lessonDate', 'ASC')
      .addOrderBy('score.id', 'ASC')
      .getMany();
  }
}
