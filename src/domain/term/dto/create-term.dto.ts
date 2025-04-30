import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { IsValidDateRange } from '../validator/date-range.validator';

export class CreateTermDto {
  @ApiProperty({ description: '🈳 DB의 학교ID', example: 1 })
  @IsInt()
  @IsNotEmpty()
  @IsPositive()
  schoolId: number;

  @ApiProperty({
    description: '🈳 학교명',
    required: false,
    example: '홍익대학교 사범대학 부속 초등학교',
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  schoolName?: string | null;

  @ApiProperty({ description: '🈵 학사년도', example: 2025 })
  @IsInt()
  @IsPositive()
  schoolYear: number;

  @ApiProperty({ description: '🈵 학기명', example: '1학기' })
  @IsString()
  @MaxLength(16)
  termName: string;

  @ApiProperty({
    description: '🈵 ISO 형식의 날짜 문자열 (YYYY-MM-DD)',
    example: '2025-03-01',
  })
  @IsString()
  @Length(10)
  start: string;

  @ApiProperty({
    description: '🈵 ISO 형식의 날짜 문자열 (YYYY-MM-DD)',
    example: '2025-09-04',
  })
  @IsString()
  @Length(10)
  @IsValidDateRange('start', {
    message: 'end date must be a valid YYYY-MM-DD and not before start date',
  })
  end: string;
}
