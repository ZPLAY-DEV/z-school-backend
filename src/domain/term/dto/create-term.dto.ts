import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
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

  @ApiProperty({
    description: '🈳 수강신청시작 시각 (YYYY-MM-DD HH:mm:ss)',
    example: '2025-06-26T00:30:00Z',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      // "YYYY-MM-DD HH:mm:ss" 형식이면 ISO 형식으로 변환
      const dateStr = value.replace(' ', 'T');
      if (!dateStr.includes('T')) {
        return new Date(value);
      }
      if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
        return new Date(dateStr + 'Z');
      }
      return new Date(dateStr);
    }
    return value as Date | null | undefined;
  })
  bookingStart?: Date | null;

  @ApiProperty({
    description: '🈳 수강신청종료 시각 (YYYY-MM-DD HH:mm:ss)',
    example: '2025-06-26T00:30:00Z',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      // "YYYY-MM-DD HH:mm:ss" 형식이면 ISO 형식으로 변환
      const dateStr = value.replace(' ', 'T');
      if (!dateStr.includes('T')) {
        return new Date(value);
      }
      if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
        return new Date(dateStr + 'Z');
      }
      return new Date(dateStr);
    }
    return value as Date | null | undefined;
  })
  bookingEnd?: Date | null;
}
