import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PlatformType } from 'src/common/enums';

export class CreateInstructorDto {
  @ApiProperty({ description: '🈳 사용자 ID', example: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  userId?: number;

  @ApiProperty({ description: '🈵 강사 이름' })
  @IsString()
  @MaxLength(16)
  name: string;

  @ApiProperty({ description: '🈵 강사 전화번호 (숫자만 입력)' })
  @IsString()
  @MaxLength(16)
  phone: string;

  @ApiProperty({
    description: '🈳 마지막 로그인 기기 web, ios, or android',
    example: PlatformType.WEB,
  })
  @IsEnum(PlatformType)
  @IsOptional()
  platform?: PlatformType = PlatformType.WEB;

  @ApiProperty({
    description: '🈳 pushToken',
    example: 'wxyz...',
    required: false,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  pushToken?: string | null;

  @ApiProperty({
    description: '🈳 내용',
    example: '특이사항 없음',
    required: false,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  note?: string | null;

  @ApiProperty({ description: '🈳 Terms agreed date' })
  @IsOptional()
  termsAgreedAt?: Date;

  @ApiProperty({ description: '🈳 리뷰점수', example: 1 })
  @IsNumber()
  @IsOptional()
  score?: number;
}
