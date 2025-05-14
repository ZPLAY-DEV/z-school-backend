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
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Public } from 'src/common/decorators/public.decorator';
import { IS3Urls } from 'src/common/interfaces';
import { UpdateStudentDto } from 'src/domain/student/dto/update-student.dto';
import { Student } from 'src/domain/student/entities/student.entity';
import { StudentService } from 'src/domain/student/student.service';
import { UploadService } from 'src/services/upload/upload.service';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('students')
export class StudentController {
  constructor(
    private readonly studentService: StudentService,
    private readonly uploadService: UploadService,
  ) {}

  //?-------------------------------------------------------------------------//
  //? CREATE
  //?-------------------------------------------------------------------------//

  @ApiOperation({ description: '이미지 URL 생성' })
  @Post(':id/s3urls')
  async generateS3Urls(
    @Param('id', ParseIntPipe) id: number,
    @Body('mime') mime: string,
  ): Promise<IS3Urls> {
    return await this.uploadService.generateStudentImageUrls(id, mime);
  }

  @ApiOperation({ description: 'Student 이미지 삭제' })
  @Post('/image/delete')
  async deleteImages(@Body('url') url: string): Promise<void> {
    return await this.studentService.deleteImages(url);
  }

  //?-------------------------------------------------------------------------//
  //? READ
  //?-------------------------------------------------------------------------//

  @ApiOperation({ description: 'Student 리스트 w/ Pagination' })
  @Public()
  @Get('paginated')
  async getAdminStudent(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Student>> {
    return await this.studentService.findAll(query);
  }

  @ApiOperation({ description: 'Student 리스트 w/ Pagination' })
  @Public()
  @Get()
  async getStudent(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Student>> {
    const activeQuery = {
      ...query,
      filter: {
        isActive: '1',
      },
    };
    return await this.studentService.findAll(activeQuery);
  }

  @ApiOperation({ description: '모든 active 배너 리스트' })
  @Public()
  @Get('active')
  async getActiveStudent(): Promise<Student[]> {
    return await this.studentService.findActive();
  }

  @ApiOperation({ description: 'Student 상세보기' })
  @Public()
  @Get(':id')
  async getStudentById(@Param('id') id: number): Promise<Student> {
    return await this.studentService.findById(id);
  }

  //?-------------------------------------------------------------------------//
  //? UPDATE
  //?-------------------------------------------------------------------------//

  @ApiOperation({ description: 'Student 수정' })
  @Patch(':id')
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateStudentDto,
  ): Promise<Student> {
    console.log(dto);
    return await this.studentService.update(id, dto);
  }

  //?-------------------------------------------------------------------------//
  //? DELETE
  //?-------------------------------------------------------------------------//

  @ApiOperation({ description: 'Student 삭제' })
  @Delete(':id')
  async remove(@Param('id') id: number): Promise<Student> {
    return await this.studentService.remove(id);
  }
}
