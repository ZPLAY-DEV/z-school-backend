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
import {
  NotifiableSourceType,
  NotifiableTarget,
  SendStatus,
} from 'src/common/enums';

export class CreateNotifiableDto {
  @ApiProperty({ description: '🈵 SchoolId', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  schoolId: number;

  @ApiProperty({ description: '🈵 TermId', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  termId: number;

  @ApiProperty({
    description: '🈵 발송 원천 타입',
    enum: NotifiableSourceType,
    example: NotifiableSourceType.NEWSLETTER,
  })
  @IsEnum(NotifiableSourceType)
  @IsNotEmpty()
  type: NotifiableSourceType;

  @ApiProperty({ description: '🈵 알림 제목', example: '새로운 공지사항' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: '🈳 메시지',
    example: '새로운 공지사항',
    required: false,
  })
  @IsString()
  @IsOptional()
  message?: string | null;

  @ApiProperty({
    description: '🈳 발송 상태',
    enum: SendStatus,
    example: SendStatus.INIT,
    required: false,
  })
  @IsEnum(SendStatus)
  @IsOptional()
  status?: SendStatus;

  @ApiProperty({
    description: '🈳 발송 대상 유형',
    enum: NotifiableTarget,
    example: NotifiableTarget.GRADE,
    required: false,
  })
  @IsEnum(NotifiableTarget)
  @IsOptional()
  target?: NotifiableTarget;

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
    description: '🈳 발송예약 시각',
    example: '2025-06-26T00:30:00Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  scheduledAt?: Date;
}
