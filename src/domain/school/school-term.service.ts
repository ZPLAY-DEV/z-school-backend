import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Term } from 'src/domain/term/entities/term.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SchoolTermService {
  private readonly logger = new Logger(SchoolTermService.name);

  constructor(
    @InjectRepository(Term)
    private readonly termRepository: Repository<Term>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async list(schoolId: number): Promise<Term[]> {
    const queryBuilder = this.termRepository
      .createQueryBuilder('term')
      .where('term.schoolId = :schoolId', { schoolId })
      .orderBy('term.id', 'DESC');

    return await queryBuilder.getMany();
  }
}
