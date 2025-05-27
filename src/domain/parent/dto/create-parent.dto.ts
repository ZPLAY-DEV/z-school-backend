import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PlatformType } from 'src/common/enums';

export class CreateParentDto {
  @ApiProperty({
    description: '🈳 User ID',
    example: '1 --- 학부모 앱으로 가입한 유저 id',
    required: false,
    type: Number,
  })
  @IsOptional()
  @IsInt()
  userId?: number;

  @ApiPropertyOptional({
    description: '🈳 학부모 성함',
    example: '홍길동 --- 학부모 성함',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  name?: string;

  @ApiProperty({
    description: '🈵 전화번호 (숫자만)',
    example: '01012345678 --- 학부모 전화번호',
    required: true,
    type: String,
  })
  @IsString()
  @MaxLength(16)
  phone: string;

  @ApiProperty({
    description: '🈳 마지막 로그인 기기 web, ios, or android',
    enum: PlatformType,
    default: PlatformType.WEB,
    example: 'WEB --- 마지막 로그인 기기',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsEnum(PlatformType)
  platform?: PlatformType;

  @ApiProperty({
    description: '🈳 내용',
    example: '특이사항 없음 --- 학부모 비고',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;

  @ApiProperty({
    description: '🈳 약관 동의 일시',
    example: '2025-01-01 12:00:00 --- 약관 동의 일시',
    required: false,
    type: Date,
  })
  @IsOptional()
  termsAgreedAt?: Date;
}
