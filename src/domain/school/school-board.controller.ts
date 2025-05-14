import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseArrayPipe,
  ParseEnumPipe,
  ParseIntPipe,
  Query,
  UseInterceptors,
} from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { SchoolBoardService } from './school-board.service';
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator';
import { BoardTarget } from 'src/common/enums';
import { Board } from '../board/entities/board.entity';

@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Schools > Board ( 학교 > 게시판 )')
@ApiCommonErrorResponseTemplate()
@Controller('schools')
export class SchoolBoardController {
  constructor(private readonly schoolBoardService: SchoolBoardService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//
  @Get(':schoolId/boards/mine')
  async listByMine(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @CurrentUserId() userId: number,
  ): Promise<Board[]> {
    return await this.schoolBoardService.listByMine(schoolId, userId);
  }

  @Get(':schoolId/boards/by-target')
  async listByTarget(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Query('target', new ParseEnumPipe(BoardTarget)) target: BoardTarget,
    @Query('groupIds', new ParseArrayPipe({ items: Number, optional: true }))
    groupIds: number[] = [],
  ): Promise<Board[]> {
    return await this.schoolBoardService.listByTarget(
      schoolId,
      target,
      groupIds,
    );
  }
}
