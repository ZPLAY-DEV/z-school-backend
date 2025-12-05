import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Group } from 'src/domain/group/entities/group.entity';
import { StudentGroupService } from './student-group.service';

@ApiTags('✳️ Students ( 학생 > 반 )')
@Controller('students')
@UseInterceptors(ClassSerializerInterceptor)
export class StudentGroupController {
  constructor(private readonly studentGroupService: StudentGroupService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @Get(':studentId/groups')
  @ApiOperation({ summary: '학생의 수강중인 모든 반 목록 조회' })
  async listGroups(
    @Param('studentId', ParseIntPipe) studentId: number,
  ): Promise<Group[]> {
    return await this.studentGroupService.listGroups(studentId);
  }

  @Get(':studentId/groups/paginated')
  @ApiOperation({ summary: '학생의 수강중인 모든 반 목록 조회 (페이지네이션)' })
  async infiniteListGroups(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Group>> {
    return await this.studentGroupService.infiniteListGroups(studentId, query);
  }
}
