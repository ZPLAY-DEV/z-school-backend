import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Validate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GroupIdForManagerConstraint } from '../validator/group-id-for-manager.validator';

export class CreateBoardDto {
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
    description: '🈳 작성자의 Group ID',
    example: 1,
    type: Number,
    required: false,
  })
  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  @Validate(GroupIdForManagerConstraint)
  groupId: number;

  @ApiProperty({
    description: '🈵 학교 ID (number)',
    example: 1,
    type: Number,
    required: true,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  schoolId: number;

  @ApiProperty({
    description: '🈵 게시글 제목',
    example: '게시글 제목',
    type: String,
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: '🈳 게시글 본문',
    example: '게시글 본문',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  body?: string;
}
