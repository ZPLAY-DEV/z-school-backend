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
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Region } from 'src/common/enums';
import { IS3Urls } from 'src/common/interfaces';
import { School } from 'src/domain/school/entities/school.entity';
import { UploadService } from 'src/services/upload/upload.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { SchoolService } from './school.service';
import {
  CreateSchoolDocs,
  DeleteSchoolDocs,
  FindSchoolDocs,
  GenerateS3UrlsDocs,
  ListSchoolsDocs,
  PaginatedSchoolsDocs,
  UpdateSchoolDocs,
} from './swagger/school-swagger.decorator';

@ApiTags('✳️ Schools ( 학교 )')
@Controller('schools')
@UseInterceptors(ClassSerializerInterceptor)
export class SchoolController {
  constructor(
    private readonly schoolService: SchoolService,
    private readonly uploadService: UploadService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @CreateSchoolDocs()
  @Post()
  async create(@Body() createSchoolDto: CreateSchoolDto): Promise<School> {
    return await this.schoolService.create(createSchoolDto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @ListSchoolsDocs()
  @Get()
  async list(@Query('region') region: Region): Promise<School[]> {
    return await this.schoolService.list(region);
  }

  @Get(':id/lessons')
  async getLessons(@Param('id', ParseIntPipe) id: number) {
    return await this.schoolService.getLessons(id);
  }

  @PaginatedSchoolsDocs()
  @Get('paginated')
  async infiniteList(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<School>> {
    return await this.schoolService.infiniteList(query);
  }

  @FindSchoolDocs()
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.schoolService.findById(id, [
      'terms',
      'statements',
      'calendars',
    ]);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @UpdateSchoolDocs()
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSchoolDto,
  ) {
    return await this.schoolService.update(id, dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @DeleteSchoolDocs()
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.schoolService.remove(id);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Extras
  //? ---------------------------------------------------------------------- ?//

  @GenerateS3UrlsDocs()
  @Post('s3urls')
  async generateS3Urls(
    @Body()
    dto: {
      schoolId: number;
      mimeType: string;
    },
  ): Promise<IS3Urls> {
    const path = [`schools`, `${dto.schoolId}`, `promos`].join('/');
    return await this.uploadService.generateUploadUrls(path, dto.mimeType);
  }
}
