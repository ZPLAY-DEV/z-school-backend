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

export class CreateContractDto {
  @ApiProperty({ description: '반 ID', example: 1 })
  @IsInt()
  @IsPositive()
  groupId: number;

  @ApiProperty({ description: '학교 선생님 ID', example: 1 })
  @IsInt()
  @IsPositive()
  samId: number;

  @ApiProperty({ description: '수업 ID', example: 1 })
  @IsInt()
  @IsPositive()
  lessonId: number;

  @ApiProperty({ description: '학기 ID', example: 1 })
  @IsInt()
  @IsPositive()
  termId: number;

  // ------------------------------------------------------------------------ //

  @ApiPropertyOptional({
    description: '누가 수업시작일(첫수업일) 등록했나?',
    enum: Actor,
    default: null,
  })
  @IsEnum(Actor)
  @IsOptional()
  startedBy?: Actor | null;

  @ApiProperty({
    description: '수업시작일(첫수업일)',
    example: '2025-05-27',
  })
  @IsString()
  start: string;

  @ApiPropertyOptional({
    description: '누가 수업종료일(마지막수업일) 등록했나?',
    enum: Actor,
    default: null,
  })
  @IsEnum(Actor)
  @IsOptional()
  endedBy?: Actor | null;

  @ApiPropertyOptional({
    description: '수업종료일(마지막수업일)',
    example: '2025-08-27',
  })
  @IsString()
  @IsOptional()
  end?: string;

  @ApiPropertyOptional({ description: '비고', example: '비고' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  note?: string;
}

// ContractBaseDto: groupId, studentId, note (모두 필수)
class ContractBaseDto {
  @ApiProperty({ description: '반 ID' })
  @IsInt()
  @IsPositive()
  groupId: number;

  @ApiProperty({ description: '담임쌤 ID' })
  @IsInt()
  @IsPositive()
  samId: number;

  @ApiProperty({ description: '수업 ID', example: 1 })
  @IsInt()
  @IsPositive()
  lessonId: number;

  @ApiProperty({ description: '학기 ID', example: 1 })
  @IsInt()
  @IsPositive()
  termId: number;

  @ApiProperty({ description: '비고' })
  @IsString()
  @MaxLength(255)
  note: string;
}

// StartContractDto: groupId, samId, startedBy, start, note (모두 필수)
export class StartContractDto extends ContractBaseDto {
  @ApiProperty({
    description: '누가 수업시작일(첫수업일) 등록했나?',
    enum: Actor,
  })
  @IsEnum(Actor)
  @IsOptional()
  startedBy?: Actor;

  @ApiProperty({ description: '수업시작일(첫수업일)', example: '2025-01-01' })
  @IsString()
  start: string;
}

// EndContractDto: groupId, studentId, endedBy, end, note (모두 필수)
export class EndContractDto extends ContractBaseDto {
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
  end: string;
}
