import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { NotifiableTarget } from 'src/common/enums';

/**
 * Notifiable 발송을 위한 DTO
 * - CreateReminderDto, CreateNewsletterDto, CreateSurveyDto 에 embed 되어 사용
 */
export class SendNotifiableDto {
  @ApiProperty({ description: '🈵 notifiableId', example: 1 })
  @IsNumber()
  @IsOptional()
  notifiableId?: number;

  @ApiProperty({
    description: '🈵 발송 대상 유형',
    enum: NotifiableTarget,
    example: NotifiableTarget.GRADE,
  })
  @IsEnum(NotifiableTarget)
  @IsNotEmpty()
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
