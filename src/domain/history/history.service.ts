import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateHistoryDto } from 'src/domain/history/dto/create-history.dto';
import { History } from 'src/domain/history/entities/history.entity';
import { Repository } from 'typeorm';

@Injectable()
export class HistoryService {
  private readonly logger = new Logger(HistoryService.name);

  constructor(
    @InjectRepository(History)
    private readonly historyRepository: Repository<History>,
  ) {}

  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateHistoryDto): Promise<History> {
    const history = this.historyRepository.create(dto);
    await this.historyRepository.save(history);

    return history;
  }

  async list(): Promise<History[]> {
    const historys = await this.historyRepository.find();
    return historys;
  }
}
