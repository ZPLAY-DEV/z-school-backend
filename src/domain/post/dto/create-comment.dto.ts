import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ description: '사용자 아이디' })
  @IsNumber()
  @IsOptional()
  userId?: number;

  @ApiProperty({ description: '게시글 아이디' })
  @IsNumber()
  @IsOptional()
  postId: number;

  @ApiProperty({ description: '상위 댓글 아이디', required: false })
  @IsNumber()
  @IsOptional()
  parentId?: number | null;

  @ApiProperty({ description: '댓글 내용' })
  @IsString()
  body: string;
}
