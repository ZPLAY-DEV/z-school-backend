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
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import {
  SchoolBoardMineListDocs,
  SchoolBoardMineListPaginatedDocs,
  SchoolBoardTargetListDocs,
  SchoolBoardTargetListPaginatedDocs,
} from '../board/swagger/school-board.swagger.decorator';

@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('✅ Schools > Board ( 학교 > 게시판 )')
@ApiCommonErrorResponseTemplate()
@Controller('schools')
export class SchoolBoardController {
  constructor(private readonly schoolBoardService: SchoolBoardService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  //? 내가 작성한 게시글 목록 조회
  @SchoolBoardMineListDocs()
  @Get(':schoolId/boards/mine')
  async listByMine(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @CurrentUserId() userId: number,
  ): Promise<Board[]> {
    return await this.schoolBoardService.listByMine(schoolId, userId);
  }

  //? 내가 작성한 게시글 목록 조회 ( 페이징 )
  @SchoolBoardMineListPaginatedDocs()
  @Get(':schoolId/boards/mine/paginated')
  async listByMinePaginated(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @CurrentUserId() userId: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Board>> {
    return await this.schoolBoardService.listByMinePaginated(
      schoolId,
      userId,
      query,
    );
  }

  //? 대상자의 게시글 목록 조회
  @SchoolBoardTargetListDocs()
  @Get(':schoolId/boards/by-target')
  async listByTarget(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Query('target', new ParseEnumPipe(BoardTarget, { optional: true }))
    target?: BoardTarget,
    @Query('groupIds', new ParseArrayPipe({ items: Number, optional: true }))
    groupIds: number[] = [],
  ): Promise<Board[]> {
    return await this.schoolBoardService.listByTarget(
      schoolId,
      target,
      groupIds,
    );
  }

  //? 대상자의 게시글 목록 조회 ( 페이징 )
  @SchoolBoardTargetListPaginatedDocs()
  @Get(':schoolId/boards/by-target/paginated')
  async listByTargetPaginated(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Query('target', new ParseEnumPipe(BoardTarget, { optional: true }))
    target: BoardTarget,
    @Query('groupIds', new ParseArrayPipe({ items: Number, optional: true }))
    groupIds: number[] = [],
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Board>> {
    return await this.schoolBoardService.listByTargetPaginated(
      schoolId,
      target,
      groupIds,
      query,
    );
  }
}
