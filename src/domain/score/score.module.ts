import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { ScoreController } from 'src/domain/score/score.controller';
import { ScoreService } from 'src/domain/score/score.service';
import { Score } from 'src/domain/score/entities/score.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Pick, Score])],
  providers: [ScoreService],
  controllers: [ScoreController],
})
export class ScoreModule {}

