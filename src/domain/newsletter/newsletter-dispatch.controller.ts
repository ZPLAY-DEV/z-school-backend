import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NewsletterType } from 'src/common/enums';
import { UpdateDispatchDto } from 'src/domain/newsletter/dto/update-dispatch.dto';
import { Dispatch } from 'src/domain/newsletter/entities/dispatch.entity';
import { NewsletterDispatchService } from 'src/domain/newsletter/newsletter-dispatch.service';

@ApiTags('✳️ Dispatches ( 뉴스레터 발송 )')
@Controller('dispatches')
@UseInterceptors(ClassSerializerInterceptor)
export class NewsletterDispatchController {
  constructor(private readonly dispatchService: NewsletterDispatchService) {}

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//
  @Get('all')
  async list(@Query('type') type?: NewsletterType): Promise<Dispatch[]> {
    return await this.dispatchService.list(type);
  }

  @Get('ready')
  async listReady(): Promise<Dispatch[]> {
    return await this.dispatchService.listReady();
  }

  @Get(':dispatchId')
  async findById(
    @Param('dispatchId', ParseIntPipe) dispatchId: number,
  ): Promise<Dispatch> {
    return await this.dispatchService.findById(dispatchId, [
      'newsletter',
      'newsletter.shortlinks',
    ]);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @Patch(':dispatchId')
  async update(
    @Param('dispatchId', ParseIntPipe) dispatchId: number,
    @Body() dto: UpdateDispatchDto,
  ): Promise<Dispatch> {
    return await this.dispatchService.update(dispatchId, dto);
  }

  @Patch(':dispatchId/cancel')
  async cancel(
    @Param('dispatchId', ParseIntPipe) dispatchId: number,
  ): Promise<Dispatch> {
    return await this.dispatchService.cancel(dispatchId);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @Delete(':dispatchId')
  async delete(
    @Param('dispatchId', ParseIntPipe) dispatchId: number,
  ): Promise<Dispatch> {
    return await this.dispatchService.delete(dispatchId);
  }
}
