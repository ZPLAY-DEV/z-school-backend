import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Post,
  UseInterceptors
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { CreateLetterDto } from './dto/create-letter.dto';
import { LetterService } from './letter.service';

@ApiTags('✅ Letters ( 발송관리 )')
@ApiCommonErrorResponseTemplate()
@UseInterceptors(ClassSerializerInterceptor)
@Controller('letters')
export class LetterController {
  constructor(private readonly letterService: LetterService) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//
  @Post()
  create(@Body() dto: CreateLetterDto) {
    return this.letterService.create(dto);
  }
}
