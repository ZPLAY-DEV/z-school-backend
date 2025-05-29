import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateDynamoRecordWithRangeDto {
  @ApiPropertyOptional({ description: 'DB의 학교ID' })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  schoolId?: number;

  @ApiPropertyOptional({ description: 'DB의 학기ID' })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  termId?: number;

  @ApiProperty({ description: 'ISO 형식의 날짜 문자열 (YYYY-MM-DD)' })
  @IsString()
  from: string; // "2025-08-14" 형식으로 저장

  @ApiProperty({ description: 'ISO 형식의 날짜 문자열 (YYYY-MM-DD)' })
  @IsString()
  to: string; // "2025-08-14" 형식으로 저장
}

export class CreateDynamoRecordWithDateDto {
  @ApiPropertyOptional({ description: 'DB의 학교ID' })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  schoolId?: number;

  @ApiPropertyOptional({ description: 'DB의 학기ID' })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  termId?: number;

  @ApiProperty({ description: 'ISO 형식의 날짜 문자열 (YYYY-MM-DD)' })
  @IsString()
  date: string; // "2025-08-14" 형식으로 저장
}
