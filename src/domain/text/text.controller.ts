import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { TextService } from 'src/domain/text/text.service';

@Controller('texts')
export class TextController {
  constructor(private readonly textService: TextService) {}

  @Get()
  async list(
    @Query('page') page: number,
    @Query('limit') limit?: number,
    @Query('start') start?: string,
    @Query('days') days?: number,
  ): Promise<any> {
    return await this.textService.list(page, limit, start, days);
  }

  @Get('aggregate')
  async aggregate(@Query('start') start?: string): Promise<any> {
    return await this.textService.aggregate(start);
  }

  @Get('remain')
  async remain(): Promise<any> {
    return await this.textService.remain();
  }

  @Get(':id')
  async detail(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: number,
  ): Promise<any> {
    return await this.textService.detail(id, limit);
  }
}
