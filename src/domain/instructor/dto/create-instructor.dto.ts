import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PlatformType } from 'src/common/enums';

export class CreateInstructorDto {
  @ApiProperty({
    description: '🈳 사용자 ID',
    example: '1 --- 앱으로 가입한 강사의 userId',
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
    example: '1 --- 앱으로 가입한 강사의 학교의 id',
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  schoolId: number;

  @ApiProperty({
    description: '🈳 강사 이름',
    example: '홍길동 --- 앱으로 가입한 강사의 이름',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  name?: string;

  @ApiProperty({
    description: '🈵 강사 전화번호 (숫자만 입력)',
    example: '01012345678 --- 앱으로 가입한 강사의 전화 번호',
    type: String,
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(16)
  phone: string;

  @ApiProperty({
    description: '🈳 마지막 로그인 기기 web, ios, or android',
    example: 'WEB --- 앱으로 가입한 강사의 마지막 로그인 기기',
    type: String,
    required: false,
  })
  @IsEnum(PlatformType)
  @IsOptional()
  platform?: PlatformType = PlatformType.WEB;

  @ApiProperty({
    description: '🈳 pushToken',
    example: 'wxyz... --- 앱으로 가입한 강사의 pushToken',
    type: String,
    required: false,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  pushToken?: string | null;

  @ApiProperty({
    description: '🈳 내용',
    example: '특이사항 없음 --- 앱으로 가입한 강사의 비고',
    type: String,
    required: false,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  note?: string | null;

  @ApiProperty({
    description: '🈳 Terms agreed date',
    example: '2025-01-01 --- 앱으로 가입한 강사가 약관동의한 시간',
    type: Date,
    required: false,
  })
  @IsOptional()
  termsAgreedAt?: Date;
}
