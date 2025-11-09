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
import { ApiTags } from '@nestjs/swagger';
import { CreateScoreDto } from 'src/domain/score/dto/create-score.dto';
import { UpdateScoreDto } from 'src/domain/score/dto/update-score.dto';
import { Score } from 'src/domain/score/entities/score.entity';
import { ScoreService } from 'src/domain/score/score.service';

@ApiTags('✳️ Score (수업 기록)')
@Controller('picks/:pickId/scores')
@UseInterceptors(ClassSerializerInterceptor)
export class ScoreController {
  constructor(private readonly scoreService: ScoreService) {}

  @Get()
  async list(@Param('pickId', ParseIntPipe) pickId: number): Promise<Score[]> {
    return await this.scoreService.listByPick(pickId);
  }

  @Post()
  async create(
    @Param('pickId', ParseIntPipe) pickId: number,
    @Body() dto: CreateScoreDto,
  ): Promise<Score> {
    return await this.scoreService.create(pickId, dto);
  }

  @Patch(':id')
  async update(
    @Param('pickId', ParseIntPipe) pickId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScoreDto,
  ): Promise<Score> {
    return await this.scoreService.update(pickId, id, dto);
  }

  @Delete(':id')
  async remove(
    @Param('pickId', ParseIntPipe) pickId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Score> {
    return await this.scoreService.remove(pickId, id);
  }
}

