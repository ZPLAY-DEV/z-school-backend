import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  ClassSerializerInterceptor,
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { CreateDispatchDto } from './dto/create-dispatch.dto';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { DispatchService } from './dispatch.service';

@ApiTags('✅ Dispatchs ( 발송관리 )')
@ApiCommonErrorResponseTemplate()
@UseInterceptors(ClassSerializerInterceptor)
@Controller('dispatchs')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//
  @Post()
  create(@Body() createNotificationDto: CreateDispatchDto) {
    return this.dispatchService.create(createNotificationDto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//
  @Get(':id/nanoid/:nanoid')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Param('nanoid', ParseIntPipe) nanoid: string,
  ) {
    // return this.dispatchService.read(id, nanoid);
  }
}
