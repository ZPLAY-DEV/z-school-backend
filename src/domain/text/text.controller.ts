import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post
} from '@nestjs/common';
import { Public } from 'src/common/decorators/public.decorator';
import { TextService } from 'src/domain/text/text.service';

@Controller('texts')
export class TextController {
  constructor(private readonly textService: TextService) {}

  @Public()
  @Post('send/:id/notification')
  async sendsendNotification(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    dto: {
      school: string;
      term: string;
      title: string;
      shortlink: string;
    },
  ): Promise<any> {
    return await this.textService.sendNotification(id, dto);
  }

  @Public()
  @Post('send/:id/registration')
  async send(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    dto: {
      school: string;
      term: string;
      period: string;
      shortlink: string;
    },
  ): Promise<any> {
    return await this.textService.sendRegistration(id, dto);
  }
}
