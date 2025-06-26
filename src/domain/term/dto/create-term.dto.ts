import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { PickRule, TermType } from 'src/common/enums';

export class CreateTermDto {
  @ApiProperty({ description: '🈳 DB의 학교ID', required: false })
  @IsInt()
  @IsOptional()
  @IsPositive()
  schoolId?: number;

  @ApiProperty({
    description: '🈳 관리자 편의를 위한 학교명',
    example: '홍익대학교 사범대학 부속 초등학교',
    required: true,
    maxLength: 24,
  })
  @IsString()
  @MaxLength(24) // '홍익대학교 사범대학 부속 초등학교'
  schoolName: string;

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
  @IsDateString()
  start: string;

  @ApiProperty({
    description: '🈵 ISO 형식의 날짜 문자열 (YYYY-MM-DD)',
    example: '2025-09-04',
    required: true,
  })
  @IsDateString()
  end: string;

  @ApiProperty({
    description: '🈳 수강신청 시작일시 (ISO 8601)',
    example: '2025-03-01T00:00:00Z',
    required: false,
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  bookingStart?: Date;

  @ApiProperty({
    description: '🈳 수강신청 종료일시 (ISO 8601)',
    example: '2025-09-04T00:00:00Z',
    required: false,
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  bookingEnd?: Date;

  @ApiProperty({
    description: '학생확정방식',
    default: PickRule.RANDOM,
  })
  @IsEnum(PickRule)
  @IsOptional()
  pickRule?: PickRule;

  @ApiProperty({
    description: '학기종류',
    default: TermType.REGULAR,
  })
  @IsEnum(TermType)
  @IsOptional()
  type?: TermType;

  @ApiProperty({ description: '시간 중복 허용 여부', default: false })
  @IsBoolean()
  @IsOptional()
  allowTimeOverlap?: boolean;

  @ApiProperty({ description: '수강신청 준비 상태', default: false })
  @IsBoolean()
  @IsOptional()
  isOfferingReady?: boolean;

  @ApiProperty({ description: '현재 학기 여부', default: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: '학기 이미지', type: [String] })
  @IsOptional()
  @IsArray()
  images?: string[];
}
