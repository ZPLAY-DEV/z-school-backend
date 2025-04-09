import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { CalendarType } from 'src/common/enums';

export class CreateCalendarDto {
  @ApiPropertyOptional({ description: 'DB의 학교ID' })
  @IsInt()
  @Type(() => Number)
  schoolId: number;

  @ApiPropertyOptional({ description: '휴일/행사일 이름' })
  @IsString()
  @MaxLength(16)
  name: string;

  @ApiProperty({ description: 'ISO 형식의 날짜 문자열 (YYYY-MM-DD)' })
  @IsString()
  @Length(10)
  date: string; // "2025-08-14" 형식으로 저장

  @ApiProperty({
    description: 'Calendar type',
    enum: CalendarType,
    default: CalendarType.OTHER,
  })
  @IsEnum(CalendarType)
  status: CalendarType;

  @ApiPropertyOptional({ description: '비고' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
