import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { History } from 'src/domain/history/entities/history.entity';
import { HistoryController } from 'src/domain/history/history.controller';
import { HistoryService } from 'src/domain/history/history.service';

@Module({
  imports: [TypeOrmModule.forFeature([History])],
  controllers: [HistoryController],
  providers: [HistoryService],
  exports: [HistoryService],
})
export class HistoryModule {}
