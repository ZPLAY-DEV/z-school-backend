import { Module } from '@nestjs/common';
import { BoardService } from './board.service';
import { BoardController } from './board.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from './entities/board.entity';
import { School } from '../school/entities/school.entity';
import { Group } from '../group/entities/group.entity';
import { Comment } from './entities/comment.entity';
import { S3Module } from 'src/services/aws/s3.module';
import { UploadModule } from 'src/services/upload/upload.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([Board, School, Group, Comment]),
    S3Module,
    UploadModule,
  ],
  controllers: [BoardController],
  providers: [BoardService],
})
export class BoardModule {}
