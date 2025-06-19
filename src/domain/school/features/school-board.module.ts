import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from 'src/domain/board/entities/board.entity';
import { Comment } from 'src/domain/board/entities/comment.entity';
import { SchoolBoardController } from 'src/domain/school/school-board.controller';
import { SchoolBoardService } from 'src/domain/school/school-board.service';
import { S3Module } from 'src/services/aws/s3.module';

@Module({
  imports: [TypeOrmModule.forFeature([Board, Comment]), S3Module],
  controllers: [SchoolBoardController],
  providers: [SchoolBoardService],
  exports: [SchoolBoardService],
})
export class SchoolBoardModule {} 