import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Actor } from 'src/common/enums';

export class CreatePickDto {
  @ApiProperty({ description: '반 ID' })
  @IsInt()
  @IsPositive()
  groupId: number;

  @ApiProperty({ description: '학생 ID' })
  @IsInt()
  @IsPositive()
  studentId: number;

  @ApiProperty({ description: '학생 책값' })
  @IsInt()
  @IsPositive()
  @IsOptional()
  bookFee?: number;

  @ApiProperty({ description: '학생 재료값' })
  @IsInt()
  @IsPositive()
  @IsOptional()
  materialFee?: number;

  @ApiPropertyOptional({
    description: '누가 수업시작일(첫수업일) 등록했나?',
    enum: Actor,
    default: null,
  })
  @IsEnum(Actor)
  @IsOptional()
  startedBy?: Actor | null;

  @ApiPropertyOptional({ description: '수업시작일(첫수업일)' })
  @IsString()
  @IsOptional()
  startedOn?: string;

  @ApiPropertyOptional({
    description: '누가 수업종료일(마지막수업일) 등록했나?',
    enum: Actor,
    default: null,
  })
  @IsEnum(Actor)
  @IsOptional()
  endedBy?: Actor | null;

  @ApiPropertyOptional({ description: '수업종료일(마지막수업일)' })
  @IsString()
  @IsOptional()
  endedOn?: string;

  @ApiPropertyOptional({ description: '비고' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  note?: string;
}

// PickBaseDto: groupId, studentId, note (모두 필수)
class PickBaseDto {
  @ApiProperty({ description: '반 ID' })
  @IsInt()
  @IsPositive()
  groupId: number;

  @ApiProperty({ description: '학생 ID' })
  @IsInt()
  @IsPositive()
  studentId: number;

  @ApiProperty({ description: '비고' })
  @IsString()
  @MaxLength(255)
  note: string;
}

// StartPickDto: groupId, studentId, startedBy, startedOn, note (모두 필수)
export class StartPickDto extends PickBaseDto {
  @ApiProperty({
    description: '누가 수업시작일(첫수업일) 등록했나?',
    enum: Actor,
  })
  @IsEnum(Actor)
  @IsOptional()
  startedBy?: Actor;

  @ApiProperty({ description: '수업시작일(첫수업일)', example: '2025-01-01' })
  @IsString()
  startedOn: string;
}

// EndPickDto: groupId, studentId, endedBy, endedOn, note (모두 필수)
export class EndPickDto extends PickBaseDto {
  @ApiProperty({
    description: '누가 수업종료일(마지막수업일) 등록했나?',
    enum: Actor,
  })
  @IsEnum(Actor)
  @IsOptional()
  endedBy?: Actor;

  @ApiProperty({
    description: '수업종료일(마지막수업일)',
    example: '2025-01-01',
  })
  @IsString()
  endedOn: string;
}
