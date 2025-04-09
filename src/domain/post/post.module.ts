import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from 'src/domain/post/entities/comment.entity';
import { Post } from 'src/domain/post/entities/post.entity';
import { User } from 'src/domain/user/entities/user.entity';
import { UploadModule } from 'src/services/upload/upload.module';
import { PostController } from './post.controller';
import { PostService } from './post.service';

@Module({
  imports: [TypeOrmModule.forFeature([Post, Comment, User]), UploadModule],
  exports: [PostService],
  providers: [PostService],
  controllers: [PostController],
})
export class PostModule {}
