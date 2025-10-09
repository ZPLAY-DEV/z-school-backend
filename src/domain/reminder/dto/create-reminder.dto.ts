import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsDateString,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    ValidateNested
} from 'class-validator';
import { NotifiableTarget } from 'src/common/enums';

/**
 * Reminder 발송 정보 (optional)
 */
export class SendReminderDto {
  @ApiProperty({
    description: '🈵 발송 대상 유형 (Reminder는 항상 SCHOOL)',
    enum: NotifiableTarget,
    example: NotifiableTarget.SCHOOL,
  })
  @IsEnum(NotifiableTarget)
  target: NotifiableTarget;

  @ApiProperty({
    description: '🈳 발송예약 시각 (없으면 즉시 발송)',
    example: '2025-06-26T00:30:00Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  scheduledAt?: Date;
}

export class CreateReminderDto {
  @ApiProperty({ description: '🈵 schoolId', type: Number, example: 1 })
  @IsInt()
  schoolId: number;

  @ApiProperty({ description: '🈵 termId', type: Number, example: 1 })
  @IsInt()
  termId: number;

  @ApiProperty({ description: '🈵 notifiableId', type: Number, example: 1 })
  @IsInt()
  @IsOptional()
  notifiableId?: number;

  @ApiProperty({
    description: '🈳 관리자 편의를 위한 학교명',
    example: '홍익대학교 사범대학 부속 초등학교',
    required: false,
    maxLength: 24,
  })
  @IsOptional()
  @IsString()
  @MaxLength(24)
  schoolName?: string;

  @ApiProperty({
    description: '🈵 학기명',
    example: '1학기',
    required: false,
    maxLength: 16,
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  termName?: string;

  @ApiProperty({
    description: '🈵 제목',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  title?: string;

  @ApiProperty({
    description: '🈵 본문',
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
    description: '🈳 발송 정보 (발송하려면 필수)',
    type: SendReminderDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SendReminderDto)
  send?: SendReminderDto;
}

