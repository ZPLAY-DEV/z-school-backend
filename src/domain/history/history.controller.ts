import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateHistoryDto } from 'src/domain/history/dto/create-history.dto';
import { History } from 'src/domain/history/entities/history.entity';
import { HistoryService } from 'src/domain/history/history.service';

@ApiTags('✳️ Histories ( 수강신청 )')
@Controller('histories')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create History (수강신청)
  //? ---------------------------------------------------------------------- ?//

  @Post()
  async create(@Body() dto: CreateHistoryDto): Promise<History> {
    return await this.historyService.create(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Cancel History (수강신청 취소)
  //? ---------------------------------------------------------------------- ?//

  @Get()
  async list(): Promise<History[]> {
    return await this.historyService.list();
  }
}
