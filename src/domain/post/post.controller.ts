import {
    Body,
    ClassSerializerInterceptor,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    UseInterceptors,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { IS3Urls } from 'src/common/interfaces';
import { CreatePostDto } from 'src/domain/post/dto/create-post.dto';
import { UpdatePostDto } from 'src/domain/post/dto/update-post.dto';
import { Post as PostEntity } from 'src/domain/post/entities/post.entity';
import { PostService } from 'src/domain/post/post.service';
import { UploadService } from 'src/services/upload/upload.service';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('posts')
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly uploadService: UploadService,
  ) {}

  //?-------------------------------------------------------------------------//
  //? CREATE
  //?-------------------------------------------------------------------------//

  @ApiOperation({ description: 'Post 생성' })
  @Post()
  async create(
    @CurrentUserId() userId: number,
    @Body() dto: CreatePostDto,
  ): Promise<PostEntity> {
    return await this.postService.create({ ...dto, userId });
  }

  @Post('s3urls')
  async generateS3Urls(
    @CurrentUserId() userId: number,
    @Body('mime') mime: string,
  ): Promise<IS3Urls> {
    return await this.uploadService.generateUserPostImageUrls(userId, mime);
  }

  //?-------------------------------------------------------------------------//
  //? READ
  //?-------------------------------------------------------------------------//

  @ApiOperation({ description: 'Post 리스트 w/ Pagination' })
  
  @Public()
  @Get('paginated')
  async getAdminPost(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<PostEntity>> {
    return await this.postService.findAll(query);
  }

  @ApiOperation({ description: '모든 active 배너 리스트' })
  @Public()
  @Get()
  async getActivePost(): Promise<PostEntity[]> {
    return await this.postService.find();
  }

  @ApiOperation({ description: 'Post 상세보기' })
  @Get(':id')
  async getPostById(@Param('id') id: number): Promise<PostEntity> {
    return await this.postService.findById(id, [`user`, `comments`]);
  }

  //?-------------------------------------------------------------------------//
  //? UPDATE
  //?-------------------------------------------------------------------------//

  @ApiOperation({ description: 'Post 수정' })
  @Patch(':id')
  async update(
    @Param('id') id: number,
    @Body() dto: UpdatePostDto,
  ): Promise<PostEntity> {
    console.log(dto);
    return await this.postService.update(id, dto);
  }

  //?-------------------------------------------------------------------------//
  //? DELETE
  //?-------------------------------------------------------------------------//

  @ApiOperation({ description: 'Post 삭제' })
  @Delete(':id')
  async remove(@Param('id') id: number): Promise<PostEntity> {
    return await this.postService.remove(id);
  }
}
