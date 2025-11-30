import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GroupScoreService } from 'src/domain/group/group-score.service';
import { Score } from 'src/domain/score/entities/score.entity';

@ApiTags('✳️ Groups > Score ( 반 > 점수 조회 )')
@UseInterceptors(ClassSerializerInterceptor)
@Controller('groups')
export class GroupScoreController {
  constructor(private readonly groupScoreService: GroupScoreService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @Get(':groupId/students/:studentId/score-list')
  async getStudentScores(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ): Promise<Score[]> {
    return await this.groupScoreService.getStudentScores(groupId, studentId);
  }
}
