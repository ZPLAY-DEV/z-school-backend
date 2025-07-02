import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Student } from 'src/domain/student/entities/student.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SchoolTermStudentService {
  private readonly logger = new Logger(SchoolTermStudentService.name);

  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async list(schoolId: number, termId: number): Promise<Student[]> {
    const result = await this.studentRepository
      .createQueryBuilder('student')
      .innerJoin('student.picks', 'pick')
      .innerJoin('pick.group', 'group')
      .innerJoin('group.lesson', 'lesson')
      .innerJoin('lesson.term', 'term')
      .where('student.schoolId = :schoolId', { schoolId })
      .andWhere('term.id = :termId', { termId })
      .distinct(true)
      .getMany();

    this.logger.debug(
      `School ${schoolId}, Term ${termId}의 학생 수: ${result.length}`,
    );

    return result;
  }

  /**
   * 해당 학교에서 사용 가능한 term들과 각 term의 학생 수를 확인
   */
  async getAvailableTerms(schoolId: number): Promise<any[]> {
    const terms = await this.studentRepository.query(
      `
      SELECT 
        t.id as term_id,
        t.termName,
        t.schoolYear,
        COUNT(DISTINCT s.id) as student_count
      FROM picks p
      INNER JOIN students s ON p.studentId = s.id
      INNER JOIN \`groups\` g ON p.groupId = g.id
      INNER JOIN lessons l ON g.lessonId = l.id
      INNER JOIN terms t ON l.termId = t.id
      WHERE s.schoolId = ? AND s.deletedAt IS NULL
      GROUP BY t.id, t.termName, t.schoolYear
      ORDER BY t.schoolYear DESC, t.id DESC
    `,
      [schoolId],
    );

    this.logger.debug(`School ${schoolId}의 사용 가능한 terms:`, terms);

    return terms;
  }
}
