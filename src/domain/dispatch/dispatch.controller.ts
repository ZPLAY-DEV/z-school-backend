import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { CreateDispatchDto } from './dto/create-dispatch.dto';
import { UpdateDispatchDto } from './dto/update-dispatch.dto';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { DispatchService } from './dispatch.service';

@ApiTags('✅ Notifications ( 발송관리 ) --- 수강신청, 공지사항, 설문지')
@ApiCommonErrorResponseTemplate()
@UseInterceptors(ClassSerializerInterceptor)
@Controller('notifications')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//
  @Post()
  create(@Body() createNotificationDto: CreateDispatchDto) {
    return this.dispatchService.create(createNotificationDto);
  }

  @Get()
  findAll() {
    return this.dispatchService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dispatchService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDispatchDto: UpdateDispatchDto,
  ) {
    return this.dispatchService.update(+id, updateDispatchDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.dispatchService.remove(+id);
  }
}
