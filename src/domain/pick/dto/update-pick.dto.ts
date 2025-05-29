import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Actor } from 'src/common/enums';
import { CreatePickDto } from './create-pick.dto';

export class UpdatePickDto extends PartialType(CreatePickDto) {
  @ApiPropertyOptional({
    description: '반 ID',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  groupId?: number;

  @ApiPropertyOptional({
    description: '학생 ID',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  studentId?: number;

  @ApiPropertyOptional({
    description: '학생 책값',
    example: 30000,
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  bookFee?: number;

  @ApiPropertyOptional({
    description: '학생 재료값',
    example: 15000,
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  materialFee?: number;

  @ApiPropertyOptional({
    description: '누가 수업시작일(첫수업일) 등록했나?',
    enum: Actor,
    example: Actor.MANAGER,
  })
  @IsEnum(Actor)
  @IsOptional()
  startedBy?: Actor;

  @ApiPropertyOptional({
    description: '수업시작일(첫수업일)',
    example: '2025-01-15',
  })
  @IsString()
  @IsOptional()
  startedOn?: string;

  @ApiPropertyOptional({
    description: '누가 수업종료일(마지막수업일) 등록했나?',
    enum: Actor,
    example: Actor.MANAGER,
  })
  @IsEnum(Actor)
  @IsOptional()
  endedBy?: Actor;

  @ApiPropertyOptional({
    description: '수업종료일(마지막수업일)',
    example: '2025-12-20',
  })
  @IsString()
  @IsOptional()
  endedOn?: string;

  @ApiPropertyOptional({
    description: '비고',
    example: '수강 정보 수정',
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  note?: string;
}
