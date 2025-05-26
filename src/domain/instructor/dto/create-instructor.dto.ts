import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PlatformType } from 'src/common/enums';

export class CreateInstructorDto {
  @ApiProperty({
    description: '🈳 사용자 ID',
    example: 1,
    type: Number,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  userId?: number;

  @ApiProperty({
    description: '🈳 School ID (number)',
    required: false,
    type: Number,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  schoolId: number;

  @ApiProperty({
    description: '🈳 강사 이름',
    example: '홍길동',
    type: String,
    required: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  name?: string;

  @ApiProperty({
    description: '🈵 강사 전화번호 (숫자만 입력)',
    example: '01012345678',
    type: String,
    required: true,
  })
  @IsString()
  @MaxLength(16)
  phone: string;

  @ApiProperty({
    description: '🈳 마지막 로그인 기기 web, ios, or android',
    example: PlatformType.WEB,
    type: String,
    required: false,
  })
  @IsEnum(PlatformType)
  @IsOptional()
  platform?: PlatformType = PlatformType.WEB;

  @ApiProperty({
    description: '🈳 pushToken',
    example: 'wxyz...',
    type: String,
    required: false,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  pushToken?: string | null;

  @ApiProperty({
    description: '🈳 내용',
    example: '특이사항 없음',
    type: String,
    required: false,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  note?: string | null;

  @ApiProperty({
    description: '🈳 Terms agreed date',
    example: '2025-01-01',
    type: Date,
    required: false,
  })
  @IsOptional()
  termsAgreedAt?: Date;
}
