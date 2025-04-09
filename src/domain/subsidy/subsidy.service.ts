import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateSubsidyDto } from 'src/domain/subsidy/dto/create-subsidy.dto';
import { UpdateSubsidyDto } from 'src/domain/subsidy/dto/update-subsidy.dto';
import { Subsidy } from 'src/domain/subsidy/entities/subsidy.entity';
import { SlackService } from 'src/services/slack/slack-service';
import { Repository } from 'typeorm/repository/Repository';

@Injectable()
export class SubsidyService {
  private readonly logger = new Logger(SubsidyService.name);

  constructor(
    @InjectRepository(Subsidy)
    private readonly subsidyRepository: Repository<Subsidy>,
    private readonly slack: SlackService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateSubsidyDto): Promise<Subsidy> {
    try {
      const item = this.subsidyRepository.create(dto);
      return await this.subsidyRepository.save(item);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateSubsidyDto) {
    const order = await this.subsidyRepository.preload({
      id,
      ...dto,
    });
    if (!order) {
      throw new NotFoundException(`entity not found`);
    }
    return await this.subsidyRepository.save(order);
  }
}
