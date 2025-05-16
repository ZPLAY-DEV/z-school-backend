import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Group } from 'src/domain/group/entities/group.entity';
import { InstructorGroupService } from 'src/domain/instructor/instructor-group.service';

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
