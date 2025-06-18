import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SchoolTermSamService {
  private readonly logger = new Logger(SchoolTermSamService.name);

  constructor(
    @InjectRepository(Sam)
    private readonly samRepository: Repository<Sam>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async list(schoolId: number, termId: number): Promise<Sam[]> {
    return this.samRepository
      .createQueryBuilder('sam')
      .innerJoin('sam.groups', 'group')
      .innerJoin('group.lesson', 'lesson')
      .innerJoin('lesson.term', 'term')
      .innerJoin('term.school', 'school')
      .where('school.id = :schoolId', { schoolId })
      .andWhere('term.id = :termId', { termId })
      .orderBy('sam.id', 'DESC')
      .getMany();
  }
}
