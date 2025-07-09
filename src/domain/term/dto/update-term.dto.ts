import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PickRule, TermType } from 'src/common/enums';

/**
 * 학기(Term) 정보 수정 DTO
 * - 실제로 업데이트 가능한 필드들만 포함
 * - schoolId는 수정 불가 (연관 관계 변경은 별도 프로세스)
 */
export class UpdateTermDto {
  @ApiPropertyOptional({
    description: '학교명 - 관리자 편의를 위한 학교 전체 명칭 (최대 24자)',
    type: String,
    example: '홍익대학교 사범대학 부속 초등학교',
    maxLength: 24,
  })
  @IsOptional()
  @IsString({ message: '학교명은 문자열이어야 합니다' })
  @MaxLength(24, { message: '학교명은 24자 이하여야 합니다' })
  schoolName?: string;

  @ApiPropertyOptional({
    description: '학사년도 - 해당 학기가 속한 학년도 (4자리 년도)',
    type: Number,
    example: 2025,
    minimum: 2020,
    maximum: 2050,
  })
  @IsOptional()
  @IsInt({ message: '학사년도는 정수여야 합니다' })
  @Min(2020, { message: '학사년도는 2020년 이상이어야 합니다' })
  schoolYear?: number;

  @ApiPropertyOptional({
    description: '학기명 - 학기를 구분하는 명칭 (최대 16자)',
    type: String,
    example: '2학기',
    maxLength: 16,
  })
  @IsOptional()
  @IsString({ message: '학기명은 문자열이어야 합니다' })
  @MaxLength(16, { message: '학기명은 16자 이하여야 합니다' })
  termName?: string;

  @ApiPropertyOptional({
    description: '학기 시작일 - ISO 형식의 날짜 문자열 (YYYY-MM-DD)',
    type: String,
    example: '2025-09-01',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  })
  @IsOptional()
  @IsDateString({}, { message: '올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)' })
  start?: string;

  @ApiPropertyOptional({
    description:
      '학기 종료일 - ISO 형식의 날짜 문자열 (YYYY-MM-DD, 시작일보다 늦어야 함)',
    type: String,
    example: '2026-02-28',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  })
  @IsOptional()
  @IsDateString({}, { message: '올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)' })
  end?: string;

  @ApiPropertyOptional({
    description: '학생 확정 방식 - 수강 신청 시 학생 배정 규칙',
    enum: PickRule,
    example: PickRule.FIRST,
  })
  @IsOptional()
  @IsEnum(PickRule, { message: '올바른 학생 확정 방식을 선택해주세요' })
  pickRule?: PickRule;

  @ApiPropertyOptional({
    description: '학기 유형 - 정규학기, 특별프로그램 등 학기의 성격',
    enum: TermType,
    example: TermType.SPECIAL,
  })
  @IsOptional()
  @IsEnum(TermType, { message: '올바른 학기 유형을 선택해주세요' })
  type?: TermType;

  @ApiPropertyOptional({
    description: '시간 중복 허용 여부 - 같은 시간대에 여러 수업 배정 허용',
    type: Boolean,
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: '시간 중복 허용 여부는 불린값이어야 합니다' })
  allowTimeOverlap?: boolean;

  @ApiPropertyOptional({
    description: '수강신청 준비 상태 - 수강신청 과목 생성 완료 여부',
    type: Boolean,
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: '수강신청 준비 상태는 불린값이어야 합니다' })
  isOfferingReady?: boolean;

  @ApiPropertyOptional({
    description:
      '수강신청 시작 일시 - ISO 형식 날짜/시간 (학기 시작 전이어야 함)',
    type: String,
    example: '2025-08-20T09:00:00Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDate({ message: '올바른 날짜/시간 형식이 아닙니다' })
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

  @ApiPropertyOptional({
    description:
      '수강신청 종료 일시 - ISO 형식 날짜/시간 (시작일시보다 늦고 학기 시작 전이어야 함)',
    type: String,
    example: '2025-08-25T18:00:00Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDate({ message: '올바른 날짜/시간 형식이 아닙니다' })
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
