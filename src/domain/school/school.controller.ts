import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Public } from 'src/common/decorators/public.decorator';
import { Region } from 'src/common/enums';
// import { S3Urls } from 'src/common/types';
import { IS3Urls } from 'src/common/interfaces';
import { School } from 'src/domain/school/entities/school.entity';
import { UploadService } from 'src/services/upload/upload.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { SchoolService } from './school.service';

@Controller('schools')
export class SchoolController {
  constructor(
    private readonly schoolService: SchoolService,
    private readonly uploadService: UploadService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @Public()
  @Post()
  async create(@Body() createSchoolDto: CreateSchoolDto): Promise<School> {
    return await this.schoolService.create(createSchoolDto);
  }

  @ApiOperation({ description: '이미지 URL 생성' })
  @Post(':id/s3urls')
  async generateS3Urls(
    @Param('id', ParseIntPipe) id: number,
    @Body('mime') mime: string,
  ): Promise<IS3Urls> {
    return await this.uploadService.generateNewsImageUrls(id, mime);
  }

  @ApiOperation({ description: 'News 이미지 삭제' })
  @Post('/image/delete')
  async deleteImages(@Body('url') url: string): Promise<void> {
    return await this.schoolService.deleteImages(url);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @Public()
  @ApiOperation({ description: '학교 리스트 w/ Pagination' })
  @Get('paginated')
  @UseInterceptors(ClassSerializerInterceptor)
  async infiniteList(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<School>> {
    return await this.schoolService.infiniteList(query);
  }

  @Public()
  @ApiOperation({ description: '학교 리스트 (all)' })
  @Get()
  @UseInterceptors(ClassSerializerInterceptor)
  async list(@Query('region') region: Region): Promise<School[]> {
    return await this.schoolService.list(region);
  }

  @Public()
  @ApiOperation({ description: 'get school detail' })
  @Get(':id')
  @UseInterceptors(ClassSerializerInterceptor)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.schoolService.findById(id, [
      'terms',
      'statements',
      'calendars',
      // 'instructors',
      // 'managers',
    ]);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'update school' })
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSchoolDto,
  ) {
    return await this.schoolService.update(id, dto);
  }

  @Public()
  @ApiOperation({ description: 'update school' })
  @Put(':id/images')
  async updateImages(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSchoolDto,
  ) {
    return await this.schoolService.update(id, dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'remove school' })
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.schoolService.remove(id);
  }
}
