import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { PickRule } from 'src/common/enums';
import {
  IsDateTimePriorToDate,
  IsValidDateRange,
  IsValidDateTimeRange,
} from 'src/domain/term/validator/date-range.validator';

export class CreateTermDto {
  @ApiProperty({ description: '🈳 DB의 학교ID', required: false })
  @IsInt()
  @IsOptional()
  @IsPositive()
  schoolId?: number;

  @ApiProperty({
    description: '🈳 학교명',
    required: false,
    example: '홍익대학교 사범대학 부속 초등학교',
    maxLength: 16,
  })
  @IsOptional()
  @IsString()
  @MaxLength(24)
  schoolName?: string | null;

  @ApiProperty({ description: '🈵 학사년도', example: 2025, required: true })
  @IsInt()
  @IsPositive()
  schoolYear: number;

  @ApiProperty({
    description: '🈵 학기명',
    example: '1학기',
    required: true,
    maxLength: 16,
  })
  @IsString()
  @MaxLength(16)
  termName: string;

  @ApiProperty({
    description: '🈵 ISO 형식의 날짜 문자열 (YYYY-MM-DD)',
    example: '2025-03-01',
    required: true,
  })
  @IsString()
  @Length(10)
  start: string;

  @ApiProperty({
    description: '🈵 ISO 형식의 날짜 문자열 (YYYY-MM-DD)',
    example: '2025-09-04',
    required: true,
  })
  @IsString()
  @Length(10)
  @IsValidDateRange('start', {
    message: 'end date must be a valid YYYY-MM-DD and not before start date',
  })
  end: string;

  @ApiProperty({
    description: '🈳 수강신청 시작일시 (ISO 8601)',
    example: '2025-03-01T00:00:00Z',
    required: false,
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDateTimePriorToDate('start', {
    message: 'bookingStart must be prior to start date',
  })
  bookingStart?: Date;

  @ApiProperty({
    description: '🈳 수강신청 종료일시 (ISO 8601)',
    example: '2025-09-04T00:00:00Z',
    required: false,
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  @IsValidDateTimeRange('bookingStart', {
    message: 'bookingEnd must be a valid date-time and not before bookingStart',
  })
  @IsDateTimePriorToDate('start', {
    message: 'bookingEnd must be prior to start date',
  })
  bookingEnd?: Date;

  @ApiProperty({ description: '시간 중복 허용 여부', default: false })
  @IsBoolean()
  allowTimeOverlap: boolean;

  @ApiProperty({
    description:
      '2차 default 선택방식. 재수강생이 정원보다 많은 경우 또는 재수강생이 정원보다 적은 경우 나머지 인원 선택방법',
    default: PickRule.RANDOM,
  })
  @IsEnum(PickRule)
  defaultPickRule: PickRule;
}
