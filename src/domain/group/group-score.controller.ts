import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IStudentScore } from 'src/common/interfaces';
import { GroupScoreService } from 'src/domain/group/group-score.service';

@ApiTags('✳️ Groups > Score ( 반 > 점수 조회 )')
@UseInterceptors(ClassSerializerInterceptor)
@Controller('groups')
export class GroupScoreController {
  constructor(private readonly groupScoreService: GroupScoreService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  // 학생별 점수
  @Get(':groupId/students/:studentId/scores')
  async findByStudent(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query('weekNumber', new ParseIntPipe({ optional: true }))
    weekNumber?: number,
  ): Promise<IStudentScore[]> {
    return await this.groupScoreService.findByStudent(
      groupId,
      studentId,
      weekNumber,
    );
  }
}
