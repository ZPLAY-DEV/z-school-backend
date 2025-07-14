import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * 학부모 정보 수정 DTO
 * - 실제로 업데이트 가능한 필드들만 포함
 * - id는 기존 부모 정보 업데이트 시 식별자로 사용
 */
export class UpdateParentDto {
  @ApiPropertyOptional({
    description: '부모 ID - 기존 부모 정보 업데이트 시 식별자',
    type: Number,
    example: 10,
  })
  @IsOptional()
  @IsInt({ message: '부모 ID는 정수여야 합니다' })
  id?: number;

  @ApiPropertyOptional({
    description: '학부모 이름 - 학부모의 실명 (최대 16자, 한글/영문만 허용)',
    type: String,
    example: '김학부',
    maxLength: 16,
  })
  @IsOptional()
  @IsString({ message: '학부모 이름은 문자열이어야 합니다' })
  @MaxLength(16, { message: '학부모 이름은 16자 이하여야 합니다' })
  name?: string;

  @ApiPropertyOptional({
    description: '전화번호 - 학부모 연락처 (하이픈 없이 숫자만, 10~11자리)',
    type: String,
    example: '01087654321',
  })
  @IsOptional()
  @IsString({ message: '전화번호는 문자열이어야 합니다' })
  phone?: string;

  @ApiPropertyOptional({
    description: '비고 - 학부모에 대한 추가 정보나 특이사항 (최대 255자)',
    type: String,
    example: '평일 오후에만 연락 가능',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: '비고는 문자열이어야 합니다' })
  @MaxLength(255, { message: '비고는 255자 이하여야 합니다' })
  note?: string;

  @ApiPropertyOptional({
    description:
      '약관동의 시각 - 개인정보 처리방침 및 이용약관 동의 시점 (ISO 8601 형식)',
    type: Date,
    example: '2025-01-01T12:00:00Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDate({ message: '약관동의 시각은 유효한 날짜여야 합니다' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const dateStr = value.replace(' ', 'T');
      if (!dateStr.includes('T')) {
        return new Date(value);
      }
      if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
        return new Date(dateStr + 'Z');
      }
      return new Date(dateStr);
    }
    return value as Date;
  })
  termsAgreedAt?: Date;
}
