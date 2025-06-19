import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateLetterDto } from './dto/create-letter.dto';
import { LetterService } from './letter.service';

@ApiTags('✅ Letters ( 공지사항 )')
@Controller('letters')
@UseInterceptors(ClassSerializerInterceptor)
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
