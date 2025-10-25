import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { CreateSamDto } from 'src/domain/sam/dto/create-sam.dto';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { SchoolSamService } from 'src/domain/school/school-sam.service';
import { UploadService } from 'src/services/upload/upload.service';
import {
  CreateSchoolSamBulkDocs,
  CreateSchoolSamBulkDryRunDocs,
  DownloadSchoolSamExcelDocs,
  SchoolSamListDocs,
  SchoolSamPaginatedDocs,
  UploadSchoolSamExcelDocs,
} from './swagger/school-sam.swagger.decorator';
import { HttpCache } from 'src/common/decorators/http-cache.decorator';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('✳️ Schools > Sams ( 학교 > 담임쌤 )')
@Controller('schools')
@UseInterceptors(ClassSerializerInterceptor)
export class SchoolSamController {
  constructor(
    private readonly schoolSamService: SchoolSamService,
    private readonly uploadService: UploadService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @CreateSchoolSamBulkDryRunDocs()
  @HttpCode(StatusCodes.OK)
  @Post(':schoolId/sams/bulk/dryrun')
  async createBulkDryrun(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Body() dtos: CreateSamDto[],
  ): Promise<Sam[]> {
    return await this.schoolSamService.createBulkDryrun(schoolId, dtos);
  }

  @CreateSchoolSamBulkDocs()
  @Post(':schoolId/sams/bulk')
  async createBulk(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Body() dtos: CreateSamDto[],
  ): Promise<number> {
    return await this.schoolSamService.createBulk(schoolId, dtos);
  }

  @UploadSchoolSamExcelDocs()
  @Post(':schoolId/sams/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadStudents(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<number> {
    if (!file) {
      throw new Error('파일이 업로드되지 않았습니다.');
    }
    const dtos = await this.schoolSamService.parseExcel(schoolId, file);
    return await this.schoolSamService.createBulk(schoolId, dtos);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @DownloadSchoolSamExcelDocs()
  @Get(':schoolId/sams/download')
  async downloadSams(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Res() res: Response,
  ) {
    const workbook = await this.schoolSamService.generateExcel(schoolId);
    const date = new Date().toISOString().split('T')[0];

    // 한글 파일명을 URL 인코딩
    const filename = `강사목록-${date}.xlsx`;
    const encodedFilename = encodeURIComponent(filename);

    // 헤더 설정
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodedFilename}`,
    );

    // 엑셀 파일을 response stream으로 작성
    await workbook.xlsx.write(res);
    res.end();
  }

  @SchoolSamListDocs()
  @Get(':schoolId/sams')
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
  ): Promise<Sam[]> {
    return await this.schoolSamService.list(schoolId);
  }

  @SchoolSamPaginatedDocs()
  @Public()
  @Get(':schoolId/sams/paginated')
  @HttpCache({
    ttl: 180, // 3분
    tags: (req) => [`schools:${req.params.schoolId}:sams`],
  })
  async infiniteList(
    @Paginate() query: PaginateQuery,
    @Param('schoolId', ParseIntPipe) schoolId: number,
  ): Promise<Paginated<Sam>> {
    return await this.schoolSamService.infiniteList(query, schoolId);
  }
}
// {{hostname}}/v1/schools/1/sams/3/dates
