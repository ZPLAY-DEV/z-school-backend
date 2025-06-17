import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';
import {
  CurrentUserId,
  CurrentUserIdAndRole,
} from 'src/common/decorators/current-user-id.decorator';
import { RemovalStatus, Role } from 'src/common/enums';
import { IS3Urls } from 'src/common/interfaces';
import { UploadService } from 'src/services/upload/upload.service';
import { BoardService } from './board.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Board } from './entities/board.entity';
import { Comment } from './entities/comment.entity';
import {
  CreateBoardDocs,
  CreateCommentDocs,
  DeleteBoardDocs,
  DeleteCommentDocs,
  FindByIdBoardDocs,
  GenerateS3PathDocs,
  UpdateBoardDocs,
  UpdateCommentDocs,
} from './swagger/board.swagger.decorator';

@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('✅ Boards ( 게시판 )')
@Controller('boards')
export class BoardController {
  constructor(
    private readonly boardService: BoardService,
    private readonly uploadService: UploadService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @GenerateS3PathDocs()
  @Post('s3urls')
  async generateS3Urls(@Body('mime') mime: string): Promise<IS3Urls> {
    return await this.uploadService.generateBoardImageUrls(mime);
  }

  @CreateBoardDocs()
  @Post()
  async createBoard(
    @CurrentUserIdAndRole() user: { id: number; role: Role },
    @Body() dto: CreateBoardDto,
  ): Promise<Board> {
    if (user.role !== Role.INSTRUCTOR) {
      throw new ForbiddenException('Forbidden user role');
    }
    return await this.boardService.createBoard({
      ...dto,
      userId: user.id,
    });
  }

  @CreateCommentDocs()
  @Post('comments')
  async createComment(
    @CurrentUserId() userId: number,
    @Body() dto: CreateCommentDto,
  ): Promise<Comment> {
    return await this.boardService.createComment({
      ...dto,
      userId,
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @FindByIdBoardDocs()
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Board> {
    return await this.boardService.findById(id, ['comments', 'school']);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @UpdateBoardDocs()
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUserIdAndRole() user: { id: number; role: Role },
    @Body() dto: UpdateBoardDto,
  ): Promise<Board> {
    if (user.role !== Role.INSTRUCTOR) {
      throw new ForbiddenException('Forbidden user role');
    }
    return this.boardService.updateBoard(id, {
      ...dto,
      userId: user.id,
    });
  }

  @UpdateCommentDocs()
  @Patch('comments/:id')
  updateComment(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUserId() userId: number,
    @Body() dto: UpdateCommentDto,
  ): Promise<Comment> {
    return this.boardService.updateComment(id, {
      ...dto,
      userId,
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @DeleteBoardDocs()
  @Delete(':id')
  async removeBoard(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUserIdAndRole() user: { id: number; role: Role },
  ): Promise<RemovalStatus> {
    if (user.role !== Role.INSTRUCTOR) {
      throw new ForbiddenException('Forbidden user role');
    }
    return await this.boardService.removeBoard(id, user.id);
  }

  @DeleteCommentDocs()
  @Delete('comments/:id')
  async removeComment(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUserId() userId: number,
  ): Promise<RemovalStatus> {
    return await this.boardService.removeComment(id, userId);
  }
}
