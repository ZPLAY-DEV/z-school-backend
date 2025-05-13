import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BoardTarget, Role } from 'src/common/enums';

export class CreateBoardDto {
  @ApiProperty({
    description: '🈵 작성자의 User ID',
    example: 1,
    type: Number,
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @ApiProperty({
    description: '🈳 작성자의 Group ID',
    example: 1,
    type: Number,
    required: false,
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  groupId?: number;

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

  @ApiProperty({
    description: '🈵 작성자의 User 유형',
    example: Role.MANAGER,
    enum: Role,
    required: true,
  })
  @IsNotEmpty()
  @IsEnum(Role)
  userRole: Role;

  @ApiProperty({
    description: '🈵 게시글 대상 (JSON)',
    example: {
      type: BoardTarget.INSTRUCTOR,
      groupId: 1,
      grade: '1학년',
      class: '1반',
    },
    type: Object,
    required: true,
  })
  @IsObject()
  @IsNotEmpty()
  target: BoardTarget;
}
