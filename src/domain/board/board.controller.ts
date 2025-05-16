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
  ParseIntPipe,
} from '@nestjs/common';

import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator';
import { RemovalStatus } from 'src/common/enums';

import { Board } from './entities/board.entity';

import { ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { BoardService } from './board.service';
import { UploadService } from 'src/services/upload/upload.service';
import { IS3Urls } from 'src/common/interfaces';

@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('✅ Boards ( 게시판 )')
@ApiCommonErrorResponseTemplate()
@Controller('boards')
export class BoardController {
  constructor(
    private readonly boardService: BoardService,
    private readonly uploadService: UploadService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @Post(':id/s3urls')
  async generateS3Urls(
    @Param('id', ParseIntPipe) id: number,
    @Body('mime') mime: string,
  ): Promise<IS3Urls> {
    return await this.uploadService.generateBoardImageUrls(id, mime);
  }

  @Post()
  async createBoard(
    @CurrentUserId() userId: number,
    @Body() dto: CreateBoardDto,
  ): Promise<Board> {
    return await this.boardService.createBoard({
      ...dto,
      userId,
    });
  }

  @Post('comments')
  async createComment(
    @CurrentUserId() userId: number,
    @Body() dto: CreateCommentDto,
  ): Promise<void> {
    return await this.boardService.createComment({
      ...dto,
      userId,
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Board> {
    return await this.boardService.findById(id, ['comments']);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBoardDto: UpdateBoardDto,
  ) {
    return this.boardService.update(id, updateBoardDto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<RemovalStatus> {
    return await this.boardService.remove(id);
  }
}
