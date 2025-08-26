import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { NotificationType } from 'src/common/enums/notification-type';
import { TextService } from 'src/domain/text/text.service';
import { getTemplateOfClassStart } from 'src/helpers/get-message-body';
import { SensService } from 'src/services/ncloud/sens.service';
import {
  FcmData,
  MessageBody,
  MixedPair,
} from 'src/services/notification/types';

@Controller('texts')
export class TextController {
  constructor(
    private readonly textService: TextService,
    private readonly sensService: SensService,
  ) {}

  @Post('alimtalk/class-start')
  @HttpCode(200)
  async sendClassStart(
    @Body()
    dto: {
      phone: string;
      school: string;
      lesson: string;
      samName: string;
      location: string;
      period: string;
      name: string;
      status: string;
    },
  ): Promise<any> {
    const data = getTemplateOfClassStart(dto);
    return await this.sensService.sendAlimtalk({
      template: 'ClassStart1',
      messages: [data],
    });
  }

  @Post()
  @HttpCode(200)
  async send(
    @Body()
    data: {
      messages: (MixedPair & MessageBody & FcmData)[];
      type: NotificationType;
      schoolId: number;
      role: string;
    },
  ): Promise<any> {
    return await this.textService.send(data);
  }

  @Post('queue')
  @HttpCode(200)
  async sendViaQueue(
    @Body()
    data: {
      messages: (MixedPair & MessageBody & FcmData)[];
      type: NotificationType;
      schoolId: number;
      role: string;
    },
  ): Promise<any> {
    return await this.textService.sendViaQueue(data);
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
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: number,
  ): Promise<any> {
    return await this.textService.detail(id, limit);
  }
}
