import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Group } from 'src/domain/group/entities/group.entity';
import { Repository } from 'typeorm';
import { Sam } from './entities/sam.entity';

@Injectable()
export class InstructorGroupService {
  private readonly logger = new Logger(InstructorGroupService.name);

  constructor(
    // @InjectRepository(Instructor)
    // private readonly instructorRepository: Repository<Instructor>,
    @InjectRepository(Sam)
    private readonly samRepository: Repository<Sam>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async list(instructorId: number): Promise<Group[]> {
    const sam = await this.samRepository.findOneOrFail({
      where: { id: instructorId },
      relations: ['groups', 'groups.groupStudents'],
    });

    return sam?.groups ?? [];
  }
}
