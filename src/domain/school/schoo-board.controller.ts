import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { SchoolBoardService } from './school-board.service';
import { CreateBoardDto } from '../board/dto/create-board.dto';

@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Schools > Board ( 학교 > 게시판 )')
@ApiCommonErrorResponseTemplate()
@Controller('schools')
export class SchoolBoardController {
  constructor(private readonly schoolBoardService: SchoolBoardService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  /**
   * @todo
   * front에서 jwt토큰에 접근을 못 하기 때문에, backend에서 jwt sub(userId)
   * 반환하여 dto에 merge 시켜주는 형식으로 해야될 수 있음. (프론트 담당자에게 물어보기)
   */
  @Post(':schoolId/boards')
  async create(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Body() dto: CreateBoardDto,
  ) {
    return await this.schoolBoardService.create({
      ...dto,
      schoolId: schoolId,
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//
}
