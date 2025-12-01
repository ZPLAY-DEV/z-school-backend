import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Score } from 'src/domain/score/entities/score.entity';
import { ScoreController } from 'src/domain/score/score.controller';
import { ScoreService } from 'src/domain/score/score.service';

@Module({
  imports: [TypeOrmModule.forFeature([Score])],
  providers: [ScoreService],
  controllers: [ScoreController],
  exports: [ScoreService],
})
export class ScoreModule {}
