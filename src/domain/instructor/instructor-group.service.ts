import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Group } from 'src/domain/group/entities/group.entity';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { Repository } from 'typeorm';

@Injectable()
export class InstructorGroupService {
  private readonly logger = new Logger(InstructorGroupService.name);

  constructor(
    @InjectRepository(Instructor)
    private readonly instructorRepository: Repository<Instructor>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async list(instructorId: number): Promise<Group[]> {
    const instructor = await this.instructorRepository.findOneOrFail({
      where: { id: instructorId },
      relations: ['groups', 'groups.groupStudents'],
    });

    return instructor?.groups ?? [];
  }
}
