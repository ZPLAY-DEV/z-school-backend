import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IStudentScore } from 'src/common/interfaces';
import { GroupScoreService } from 'src/domain/group/group-score.service';
import { CreateScoreDto } from 'src/domain/score/dto/create-score.dto';
import { Score } from 'src/domain/score/entities/score.entity';

@ApiTags('✳️ Groups > Score ( 반 > 점수 조회 )')
@UseInterceptors(ClassSerializerInterceptor)
@Controller('groups')
export class GroupScoreController {
  constructor(private readonly groupScoreService: GroupScoreService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create/Upsert
  //? ---------------------------------------------------------------------- ?//

  @HttpCode(200)
  @Post(':groupId/students/:studentId/scores/bulk')
  async upsertBulk(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() dtos: CreateScoreDto[],
  ): Promise<Score[]> {
    return await this.groupScoreService.upsertBulk(
      dtos.map((dto) => ({
        ...dto,
        groupId,
        studentId,
      })),
    );
  }

  @HttpCode(200)
  @Post(':groupId/students/:studentId/scores')
  async upsert(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() dto: CreateScoreDto,
  ): Promise<Score> {
    return await this.groupScoreService.upsert({
      ...dto,
      groupId,
      studentId,
    });
  }

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

  // 주차별 점수
  @Get(':groupId/weeks/:weekNumber/scores')
  async findByWeek(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('weekNumber', ParseIntPipe) weekNumber: number,
    @Query('studentId', new ParseIntPipe({ optional: true }))
    studentId?: number,
    @Query('userId', new ParseIntPipe({ optional: true }))
    userId?: number,
  ): Promise<IStudentScore[]> {
    return await this.groupScoreService.findByWeek(groupId, weekNumber, {
      studentId,
      userId,
    });
  }
}
