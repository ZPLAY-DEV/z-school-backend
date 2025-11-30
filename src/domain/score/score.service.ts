import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Score } from 'src/domain/score/entities/score.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ScoreService {
  constructor(
    @InjectRepository(Score)
    private readonly scoreRepository: Repository<Score>,
  ) {}

  /**
   * 특정 syllabus와 학생의 주차별 점수 조회
   * @param syllabusId - 교육과정 ID
   * @param studentId - 학생 ID
   * @returns 주차별로 정렬된 점수 목록
   */
  async listBySyllabusAndStudent(
    syllabusId: number,
    studentId: number,
  ): Promise<Score[]> {
    return await this.scoreRepository
      .createQueryBuilder('score')
      .innerJoin('score.pick', 'pick', 'pick.studentId = :studentId', {
        studentId,
      })
      .innerJoin('pick.group', 'group')
      .innerJoin('group.lesson', 'lesson')
      .innerJoin(
        'lesson.curriculums',
        'curriculum',
        'curriculum.syllabusId = :syllabusId',
        { syllabusId },
      )
      .andWhere('pick.isActive = :isActive', { isActive: true })
      .orderBy('score.weekNumber', 'ASC')
      .getMany();
  }

  /**
   * 특정 그룹의 특정 주차 전체 학생 점수 조회
   * @param groupId - 그룹(반) ID
   * @param weekNumber - 주차 번호
   * @returns 학생 순서(index)대로 정렬된 점수 목록
   */
  async listByGroupAndWeek(
    groupId: number,
    weekNumber: number,
  ): Promise<Score[]> {
    return await this.scoreRepository
      .createQueryBuilder('score')
      .innerJoin('score.pick', 'pick', 'pick.groupId = :groupId', { groupId })
      .where('score.weekNumber = :weekNumber', { weekNumber })
      .andWhere('pick.isActive = :isActive', { isActive: true })
      .orderBy('pick.index', 'ASC')
      .getMany();
  }

  /**
   * 특정 그룹의 특정 학생 점수 조회
   * @param groupId - 그룹(반) ID
   * @param studentId - 학생 ID
   * @returns 주차별로 정렬된 점수 목록
   */
  async listByGroupAndStudent(
    groupId: number,
    studentId: number,
  ): Promise<Score[]> {
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
