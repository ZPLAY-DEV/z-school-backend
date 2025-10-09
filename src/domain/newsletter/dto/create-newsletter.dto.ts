import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsDateString,
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    ValidateNested,
} from 'class-validator';
import { NewsletterType, NotifiableTarget } from 'src/common/enums';

/**
 * Newsletter 발송 정보 (optional)
 */
export class SendNewsletterDto {
  @ApiProperty({
    description: '🈵 발송 대상 유형',
    enum: NotifiableTarget,
    example: NotifiableTarget.SCHOOL,
  })
  @IsEnum(NotifiableTarget)
  target: NotifiableTarget;

  @ApiProperty({
    description: '🈳 대상별 아이템 ID 리스트',
    example: [1, 2, 3],
    required: false,
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  targetItems?: number[];

  @ApiProperty({
    description: '🈳 발송 대상 레이블',
    example: '3학년',
    required: false,
  })
  @IsString()
  @IsOptional()
  targetLabel?: string;

  @ApiProperty({
    description: '🈳 발송예약 시각 (없으면 즉시 발송)',
    example: '2025-06-26T00:30:00Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  scheduledAt?: Date;
}

export class CreateNewsletterDto {
  @ApiProperty({ description: '🈵 schoolId', type: Number, example: 1 })
  @IsInt()
  schoolId: number;

  @ApiProperty({ description: '🈵 termId', type: Number, example: 1 })
  @IsInt()
  termId: number;

  @ApiProperty({ description: '🈵 notifiableId', type: Number, example: 1 })
  @IsInt()
  notifiableId: number;

  @ApiProperty({
    description: '🈳 관리자 편의를 위한 학교명',
    example: '홍익대학교 사범대학 부속 초등학교',
    required: true,
    maxLength: 24,
  })
  @IsOptional() //! 자동 입력된다.
  @IsString()
  @MaxLength(24)
  schoolName?: string;

  @ApiProperty({
    description: '🈵 학기명',
    example: '1학기',
    required: true,
    maxLength: 16,
  })
  @IsOptional() //! 자동 입력된다.
  @IsString()
  @MaxLength(16)
  termName?: string;

  @ApiProperty({
    description: '🈵 게시글 제목',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  title?: string;

  @ApiProperty({
    description: '🈵 게시글 본문',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  body?: string | null;

  @ApiProperty({ description: '🈳 첨부 파일 URL', type: [String] })
  @IsOptional()
  @IsArray()
  images?: string[] | null;

  @ApiProperty({
    description: '🈵 뉴스레터 종류',
    enum: NewsletterType,
    required: true,
    example: NewsletterType.CHANGES,
  })
  @IsOptional()
  @IsEnum(NewsletterType)
  type?: NewsletterType;

  @ApiProperty({
    description: '🈳 발송 정보 (발송하려면 필수)',
    type: SendNewsletterDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SendNewsletterDto)
  send?: SendNewsletterDto;
}
