import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { Group } from 'src/domain/group/entities/group.entity';
import { InstructorGroupService } from 'src/domain/instructor/instructor-group.service';

@ApiTags('✅ Instructors ( 강사 ) > Groups ( 반 )')
@ApiCommonErrorResponseTemplate()
@Controller('instructors')
export class InstructorGroupController {
  constructor(
    private readonly instructorGroupService: InstructorGroupService,
  ) {}

  //* ---------------------------------------------------------------------- *//
  //* Read
  //* ---------------------------------------------------------------------- *//

  @Get(':instructorId/groups')
  @ApiOperation({ summary: '이 강사의 반 정보들' })
  async list(
    @Param('instructorId', ParseIntPipe) instructorId: number,
  ): Promise<Group[]> {
    return await this.instructorGroupService.list(instructorId);
  }
}
