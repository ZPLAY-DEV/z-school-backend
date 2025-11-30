import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Score } from 'src/domain/score/entities/score.entity';
import { ScoreService } from 'src/domain/score/score.service';

@ApiTags('✳️ Score (점수 조회)')
@Controller('scores')
@UseInterceptors(ClassSerializerInterceptor)
export class ScoreController {
  constructor(private readonly scoreService: ScoreService) {}

  @Get('syllabus/:syllabusId/student/:studentId')
  listBySyllabusAndStudent(
    @Param('syllabusId', ParseIntPipe) syllabusId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ): Promise<Score[]> {
    return this.scoreService.listBySyllabusAndStudent(syllabusId, studentId);
  }

  @Get('groups/:groupId/weeks/:weekNumber')
  listByGroupAndWeek(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('weekNumber', ParseIntPipe) weekNumber: number,
  ): Promise<Score[]> {
    return this.scoreService.listByGroupAndWeek(groupId, weekNumber);
  }

  @Get('groups/:groupId/students/:studentId')
  async listByGroupAndStudent(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ): Promise<Score[]> {
    return await this.scoreService.listByGroupAndStudent(groupId, studentId);
  }
}
