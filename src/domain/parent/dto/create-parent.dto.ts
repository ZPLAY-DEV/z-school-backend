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
  @ApiProperty({ description: '🈳 User ID', example: 1 })
  @IsOptional()
  @IsInt()
  userId?: number;

  @ApiPropertyOptional({ description: '🈳 학부모 성함', example: '홍길동' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  name?: string;

  @ApiProperty({ description: '🈵 전화번호 (숫자만)' })
  @IsString()
  @MaxLength(16)
  phone: string;

  @ApiProperty({
    description: '🈳 마지막 로그인 기기 web, ios, or android',
    enum: PlatformType,
    default: PlatformType.WEB,
  })
  @IsOptional()
  @IsEnum(PlatformType)
  platform?: PlatformType;

  @ApiProperty({ description: '🈳 내용', example: '특이사항 없음' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;

  @ApiProperty({ description: '🈳 Terms agreed date' })
  @IsOptional()
  termsAgreedAt?: Date;
}
