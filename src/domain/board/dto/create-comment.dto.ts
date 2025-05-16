import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Role } from 'src/common/enums';

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
    description: '🈳 상위 댓글 아이디',
    required: false,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  parentId?: number;

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
    description:
      '🈵 댓글 작성자 유형 ( MANAGER, INSTRUCTOR, PARENT ) 3 case만 요청  ',
    example: Role.INSTRUCTOR,
    enum: Role,
    required: true,
  })
  @IsEnum(Role)
  @IsNotEmpty()
  userRole: Role;

  @ApiProperty({
    description: '🈳 작성자 이름',
    example: '홍길동',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;
}
