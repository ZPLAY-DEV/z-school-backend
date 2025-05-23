import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Group } from 'src/domain/group/entities/group.entity';
import { Repository } from 'typeorm';
import { Sam } from './entities/sam.entity';

@Injectable()
export class SamGroupService {
  private readonly logger = new Logger(SamGroupService.name);

  constructor(
    @InjectRepository(Sam)
    private readonly samRepository: Repository<Sam>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async list(samId: number): Promise<Group[]> {
    const sam = await this.samRepository.findOneOrFail({
      where: { id: samId },
      relations: ['groups', 'groups.groupStudents'],
    });

    return sam?.groups ?? [];
  }
}
