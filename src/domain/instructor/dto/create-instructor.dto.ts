import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * 강사 생성/연결 DTO
 * - 새로운 강사 생성 또는 기존 강사 연결 시 사용
 * - 기존 강사 연결: id 포함 (다른 필드들은 무시됨)
 * - 새로운 강사 생성: id 제외, phone 필수, 나머지 선택
 */
export class CreateInstructorDto {
  @ApiPropertyOptional({
    description: `강사 ID - 기존 등록된 강사와 연결할 때 사용
    
✅ 기존 강사 연결: id만 제공 (다른 필드들은 무시됨)
✅ 새로운 강사 생성: id 제외, phone 필수`,
    type: Number,
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt({ message: '강사 ID는 정수여야 합니다' })
  @Min(1, { message: '강사 ID는 1 이상이어야 합니다' })
  id?: number;

  @ApiPropertyOptional({
    description: 'User ID - 회원가입한 사용자와 연결할 때 사용 (선택적)',
    type: Number,
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt({ message: 'User ID는 정수여야 합니다' })
  @Min(1, { message: 'User ID는 1 이상이어야 합니다' })
  userId?: number;

  @ApiProperty({
    description: '강사 이름 - 강사의 실명 (최대 16자, 한글/영문만 허용)',
    type: String,
    example: '홍길동',
    maxLength: 16,
  })
  @IsNotEmpty()
  @IsString({ message: '강사 이름은 문자열이어야 합니다' })
  @MinLength(2, { message: '이름이 없습니다.' })
  @MaxLength(16, { message: '강사 이름은 16자 이하여야 합니다' })
  name: string;

  @ApiProperty({
    description: `전화번호 - 강사 연락처 (하이픈 없이 숫자만, 10~11자리)
    
⚠️ 새로운 강사 생성 시에만 필수 (id가 없는 경우)`,
    type: String,
    example: '01012345678',
  })
  @IsString({ message: '전화번호는 문자열이어야 합니다' })
  @Matches(/^010(-\d{4}-\d{4}|\d{8})$/, {
    message: '휴대전화 번호형식이 아닙니다.',
  })
  phone: string;

  @ApiPropertyOptional({
    description: '비고 - 강사에 대한 추가 정보나 특이사항 (최대 255자)',
    type: String,
    example: '10년 경력의 베테랑 강사',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: '비고는 문자열이어야 합니다' })
  @MaxLength(255, { message: '비고는 255자 이하여야 합니다' })
  note?: string | null;

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
