import { ApiProperty } from '@nestjs/swagger';

export class CommentResponseDto {
  @ApiProperty({
    description: '댓글 ID',
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: '댓글 작성자 ID',
    type: Number,
  })
  userId: number;

  @ApiProperty({
    description: '댓글 게시글 ID',
    type: Number,
  })
  boardId: number;

  @ApiProperty({
    description: '댓글 내용',
    type: String,
  })
  content: string;

  @ApiProperty({
    description: '댓글 작성자 이름',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: '댓글 작성일',
    type: Date,
  })
  createdAt: Date;

  @ApiProperty({
    description: '댓글 수정일',
    type: Date,
  })
  updatedAt: Date;
}
