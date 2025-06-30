import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { SchoolTermComboResponseDto } from 'src/domain/school/dto/school-term-combo-response.dto';
import { Student } from 'src/domain/student/entities/student.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SchoolTermComboService {
  private readonly logger = new Logger(SchoolTermComboService.name);

  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Sam)
    private readonly samRepository: Repository<Sam>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async list(
    schoolId: number,
    termId: number,
  ): Promise<SchoolTermComboResponseDto> {
    // 1. Get Lessons
    const lessons = await this.lessonRepository
      .createQueryBuilder('lesson')
      .innerJoinAndSelect('lesson.term', 'term')
      .innerJoinAndSelect('term.school', 'school')
      .where('term.id = :termId', { termId })
      .andWhere('school.id = :schoolId', { schoolId })
      .getMany();

    // 2. Get Sams
    const sams = await this.samRepository
      .createQueryBuilder('sam')
      .innerJoin('sam.contracts', 'contract')
      .innerJoin('contract.group', 'group')
      .innerJoin('group.lesson', 'lesson')
      .innerJoin('lesson.term', 'term')
      .innerJoin('term.school', 'school')
      .where('term.id = :termId', { termId })
      .andWhere('school.id = :schoolId', { schoolId })
      .distinct(true)
      .getMany();

    // 3. Get Students
    const students = await this.studentRepository
      .createQueryBuilder('student')
      .innerJoin('student.picks', 'pick')
      .innerJoin('pick.group', 'group')
      .innerJoin('group.lesson', 'lesson')
      .innerJoin('lesson.term', 'term')
      .innerJoin('term.school', 'school')
      .where('term.id = :termId', { termId })
      .andWhere('school.id = :schoolId', { schoolId })
      .distinct(true)
      .getMany();

    return {
      lessons,
      sams,
      students,
    };
  }
}
