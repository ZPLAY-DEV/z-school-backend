import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { SendBulkTextDto } from 'src/domain/text/dto/send-bulk-text.dto';
import { SendTextDto } from 'src/domain/text/dto/send-text.dto';
import { TextService } from 'src/domain/text/text.service';

@Controller('texts')
export class TextController {
  constructor(private readonly textService: TextService) {}

  @Post()
  async send(@Body() dto: SendTextDto): Promise<any> {
    const { sender, receiver, message, dryrun } = dto;
    return await this.textService.send(sender, receiver, message, dryrun);
  }

  @Post('bulk')
  async sendBulk(@Body() dto: SendBulkTextDto): Promise<any> {
    const { sender, phones, message, dryrun } = dto;
    return await this.textService.sendBulk(sender, phones, message, dryrun);
  }

  @Post('queue')
  async sendTextViaQueue(@Body() dto: SendTextDto): Promise<any> {
    const { sender, receiver, message, dryrun } = dto;
    return await this.textService.sendTextViaQueue(
      sender,
      receiver,
      message,
      dryrun,
    );
  }

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
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ): Promise<any> {
    return await this.textService.detail(id, limit);
  }
}
