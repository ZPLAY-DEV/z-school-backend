import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PlatformType } from 'src/common/enums';

export class CreateManagerDto {
  @ApiProperty({ description: 'User ID', example: 1 })
  @IsInt()
  userId: number;

  @ApiPropertyOptional({ description: 'School ID', example: 1 })
  @IsInt()
  @IsOptional()
  schoolId?: number;

  @ApiPropertyOptional({
    description: '학교 이름',
    example: '홍익대학교 사범대학 부속 초등학교',
    maxLength: 32,
  })
  @IsString()
  @MaxLength(24)
  @IsOptional()
  schoolName?: string;

  @ApiPropertyOptional({
    description: '성함',
    example: '홍길동',
    maxLength: 16,
  })
  @IsString()
  @MaxLength(16)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '010-1234-5678',
    maxLength: 16,
  })
  @IsString()
  @MaxLength(16)
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: '마지막 로그인 기기 web, ios, or android',
    enum: PlatformType,
    default: PlatformType.WEB,
  })
  @IsEnum(PlatformType)
  @IsOptional()
  platform?: PlatformType;

  @ApiPropertyOptional({ description: '내용', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  note?: string;

  @ApiProperty({
    description: '🈳 약관동의 시각',
    example: '2025-01-01T12:00:00Z',
    required: false,
    type: Date,
  })
  @IsOptional()
  @IsDate()
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
