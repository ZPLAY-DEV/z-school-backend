import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseArrayPipe,
  ParseIntPipe,
  Query,
  UseInterceptors,
} from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';

import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator';
import { Board } from '../board/entities/board.entity';
import {
  SchoolBoardListDocs,
  SchoolBoardListPaginatedDocs,
  SchoolBoardMineListDocs,
  SchoolBoardMineListPaginatedDocs,
  SchoolBoardTargetListDocs,
  SchoolBoardTargetListPaginatedDocs,
} from '../board/swagger/school-board.swagger.decorator';
import { SchoolBoardService } from './school-board.service';

@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('✅ Schools > Board ( 학교 > 게시판 )')
@Controller('schools')
export class SchoolBoardController {
  constructor(private readonly schoolBoardService: SchoolBoardService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  //? 학교에서 사용자가 작성한 게시글 목록 조회
  @SchoolBoardListDocs()
  @Get(':schoolId/boards')
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
  ): Promise<Board[]> {
    return await this.schoolBoardService.list(schoolId);
  }

  //? 학교에서 사용자가 작성한 게시글 목록 조회 ( 페이징 )
  @SchoolBoardListPaginatedDocs()
  @Get(':schoolId/boards/paginated')
  async listPaginated(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Board>> {
    return await this.schoolBoardService.listPaginated(schoolId, query);
  }

  //? 내가 작성한 게시글 목록 조회
  @SchoolBoardMineListDocs()
  @Get('boards/mine')
  async listByMine(@CurrentUserId() userId: number): Promise<Board[]> {
    return await this.schoolBoardService.listByMine(userId);
  }

  //? 내가 작성한 게시글 목록 조회 ( 페이징 )
  @SchoolBoardMineListPaginatedDocs()
  @Get('boards/mine/paginated')
  async listByMinePaginated(
    @CurrentUserId() userId: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Board>> {
    return await this.schoolBoardService.listByMinePaginated(userId, query);
  }

  //? 대상자의 게시글 목록 조회
  @SchoolBoardTargetListDocs()
  @Get('boards/by-target')
  async listByTarget(
    @Query('groupIds', new ParseArrayPipe({ items: Number, optional: true }))
    groupIds: number[] = [],
  ): Promise<Board[]> {
    return await this.schoolBoardService.listByTarget(groupIds);
  }

  //? 대상자의 게시글 목록 조회 ( 페이징 )
  @SchoolBoardTargetListPaginatedDocs()
  @Get('boards/by-target/paginated')
  async listByTargetPaginated(
    @Query('groupIds', new ParseArrayPipe({ items: Number, optional: true }))
    groupIds: number[] = [],
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Board>> {
    return await this.schoolBoardService.listByTargetPaginated(groupIds, query);
  }
}
