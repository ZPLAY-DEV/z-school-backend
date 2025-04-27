import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateTermDto {
  @ApiProperty({ description: '🈳 DB의 학교ID' })
  @IsInt()
  @IsOptional()
  @IsPositive()
  schoolId: number;

  @ApiProperty({ description: '🈳 학교명', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  schoolName?: string | null;

  @ApiProperty({ description: '🈵 학사년도' })
  @IsInt()
  @IsPositive()
  schoolYear: number;

  @ApiProperty({ description: '🈵 학기명' })
  @IsString()
  @MaxLength(16)
  termName: string;

  @ApiProperty({ description: '🈵 ISO 형식의 날짜 문자열 (YYYY-MM-DD)' })
  @IsString()
  @Length(10)
  start: string;

  @ApiProperty({ description: '🈵 ISO 형식의 날짜 문자열 (YYYY-MM-DD)' })
  @IsString()
  @Length(10)
  end: string;
}
