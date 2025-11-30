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
import { PickScoreService } from 'src/domain/pick/pick-score.service';
import { CreateScoreDto } from 'src/domain/score/dto/create-score.dto';
import { UpdateScoreDto } from 'src/domain/score/dto/update-score.dto';
import { Score } from 'src/domain/score/entities/score.entity';

@ApiTags('✳️ Picks ( 확정수강생; 반·학생 pivot )')
@Controller('picks/:pickId/scores')
@UseInterceptors(ClassSerializerInterceptor)
export class PickScoreController {
  constructor(private readonly pickScoreService: PickScoreService) {}

  @Get()
  async list(@Param('pickId', ParseIntPipe) pickId: number): Promise<Score[]> {
    return await this.pickScoreService.listByPick(pickId);
  }

  @Post()
  async create(
    @Param('pickId', ParseIntPipe) pickId: number,
    @Body() dto: CreateScoreDto,
  ): Promise<Score> {
    return await this.pickScoreService.create(pickId, dto);
  }

  @Patch(':id')
  async update(
    @Param('pickId', ParseIntPipe) pickId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScoreDto,
  ): Promise<Score> {
    return await this.pickScoreService.update(pickId, id, dto);
  }

  @Delete(':id')
  async remove(
    @Param('pickId', ParseIntPipe) pickId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Score> {
    return await this.pickScoreService.remove(pickId, id);
  }
}
