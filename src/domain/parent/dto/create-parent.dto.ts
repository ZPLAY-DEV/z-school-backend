import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsDate,
    IsInt,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    Min,
} from 'class-validator';

/**
 * 학부모 생성/연결 DTO
 * - 새로운 학부모 생성 또는 기존 학부모 연결 시 사용
 * - 기존 부모 연결: id 포함 (다른 필드들은 무시됨)
 * - 새로운 부모 생성: id 제외, phone 필수, 나머지 선택
 */
export class CreateParentDto {
  @ApiPropertyOptional({
    description: `학부모 ID - 기존 등록된 학부모와 연결할 때 사용
    
✅ 기존 부모 연결: id만 제공 (다른 필드들은 무시됨)
✅ 새로운 부모 생성: id 제외, phone 필수`,
    type: Number,
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt({ message: '학부모 ID는 정수여야 합니다' })
  @Min(1, { message: '학부모 ID는 1 이상이어야 합니다' })
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

  @ApiPropertyOptional({
    description: '학부모 이름 - 학부모의 실명 (최대 16자, 한글/영문만 허용)',
    type: String,
    example: '홍길순',
    maxLength: 16,
    pattern: '^[가-힣a-zA-Z\\s]+$',
  })
  @IsOptional()
  @IsString({ message: '학부모 이름은 문자열이어야 합니다' })
  @MaxLength(16, { message: '학부모 이름은 16자 이하여야 합니다' })
  @Matches(/^[가-힣a-zA-Z\s]+$/, {
    message: '학부모 이름은 한글, 영문, 공백만 허용됩니다',
  })
  name?: string;

  @ApiProperty({
    description: `전화번호 - 학부모 연락처 (하이픈 없이 숫자만, 10~11자리)
    
⚠️ 새로운 부모 생성 시에만 필수 (id가 없는 경우)`,
    type: String,
    example: '01066661031',
    pattern: '^[0-9]{10,11}$',
  })
  @IsOptional() // 기존 부모 연결 시에는 불필요하므로 optional로 변경
  @IsString({ message: '전화번호는 문자열이어야 합니다' })
  @Matches(/^[0-9]{10,11}$/, {
    message: '전화번호는 10~11자리 숫자만 입력해주세요',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: '비고 - 학부모에 대한 추가 정보나 특이사항 (최대 255자)',
    type: String,
    example: '주말에만 연락 가능',
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
