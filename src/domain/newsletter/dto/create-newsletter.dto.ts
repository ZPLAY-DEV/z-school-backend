import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { NewsletterTarget, NewsletterType } from 'src/common/enums';
import { SendStatus } from 'src/common/enums/send-status';

export class CreateNewsletterDto {
  @ApiProperty({ description: '🈵 schoolId', type: Number, example: 1 })
  @IsInt()
  schoolId: number;

  @ApiProperty({ description: '🈵 termId', type: Number, example: 1 })
  @IsInt()
  termId: number;

  @ApiProperty({
    description: '🈳 관리자 편의를 위한 학교명',
    example: '홍익대학교 사범대학 부속 초등학교',
    required: true,
    maxLength: 24,
  })
  @IsOptional() //! 자동 입력 예정이라 Optional
  @IsString()
  @MaxLength(24)
  schoolName?: string;

  @ApiProperty({
    description: '🈵 학기명',
    example: '1학기',
    required: true,
    maxLength: 16,
  })
  @IsOptional() //! 자동 입력 예정이라 Optional
  @IsString()
  @MaxLength(16)
  termName?: string;

  @ApiProperty({
    description: '🈵 게시글 제목',
    type: String,
    required: true,
  })
  @IsString()
  @MaxLength(32)
  title: string;

  @ApiProperty({
    description: '🈵 게시글 본문',
    type: String,
    required: true,
  })
  @IsString()
  body: string;

  @ApiProperty({ description: '🈳 첨부 파일 URL', type: [String] })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiProperty({
    description: '🈵 뉴스레터 종류',
    enum: NewsletterType,
    required: true,
    example: NewsletterType.REGISTRATION,
  })
  @IsEnum(NewsletterType)
  type: NewsletterType;

  @ApiProperty({
    description: '🈵 뉴스레터 발송상태',
    enum: SendStatus,
    required: false,
    example: SendStatus.INIT,
  })
  @IsOptional()
  @IsEnum(SendStatus)
  status?: SendStatus;

  @ApiProperty({ description: '🈵 뉴스레터 대상', required: false })
  @IsOptional()
  @IsEnum(NewsletterTarget)
  target?: NewsletterTarget;

  @ApiProperty({ description: '🈳 뉴스레터 대상 아이템들', required: false })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  targetItems?: number[];

  @ApiProperty({ description: '🈳 뉴스레터 대상 레이블', required: false })
  @IsOptional()
  @IsString()
  targetLabel?: string;

  @ApiProperty({ description: '🈳 관련 모든 studentIds', required: false })
  @IsOptional() //! 자동 입력 예정이라 Optional
  @IsArray()
  @Type(() => Number)
  studentIds?: number[];

  @ApiProperty({
    description:
      '🈳 발송 시간 (예: "2025-06-24 10:00:00" 또는 "2025-06-24T10:00:00Z")',
    example: '2025-06-05T00:30:00Z',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      // "YYYY-MM-DD HH:mm:ss" 형식을 ISO 형식으로 변환
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
  scheduledAt?: Date | null;
}
