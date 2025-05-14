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
import { BoardService } from './board.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { CurrentUserIdAndRole } from 'src/common/decorators/current-user-id.decorator';
import { RemovalStatus, Role } from 'src/common/enums';
import { Board } from './entities/board.entity';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UploadService } from 'src/services/upload/upload.service';
import { IS3Urls } from 'src/common/interfaces';

@UseInterceptors(ClassSerializerInterceptor)
@ApiTags(' Boards ( 게시판 )')
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
  async create(
    @CurrentUserIdAndRole() user: { id: number; role: Role },
    @Body() dto: CreateBoardDto,
  ): Promise<Board> {
    return await this.boardService.create({
      ...dto,
      userId: user.id,
      userRole: user.role,
    });
  }

  @Post('comments')
  async createComment(
    @CurrentUserIdAndRole() user: { id: number; role: Role },
    @Body() dto: CreateCommentDto,
  ) {
    // return await this.boardService.createComment(dto, user.id, user.role);
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
