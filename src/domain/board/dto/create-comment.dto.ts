import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    description: '🈳 작성자의 User ID',
    example: 1,
    type: Number,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  userId?: number;

  @ApiProperty({
    description: '🈵 게시글 아이디',
    example: 1,
    type: Number,
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  boardId: number;

  @ApiProperty({
    description: '🈳 댓글 내용',
    example: '댓글 내용',
    type: String,
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: '🈵 작성자 이름',
    example: '홍길동',
    type: String,
    required: false,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  name: string;
}
