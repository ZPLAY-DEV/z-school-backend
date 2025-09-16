import { ValidateNested } from '@nestjs/class-validator';
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
} from 'class-validator';
import { NewsletterTarget, NewsletterType } from 'src/common/enums';
import { SendStatus } from 'src/common/enums/send-status';
import { CreateNotificationDto } from 'src/domain/newsletter/dto/create-notification.dto';

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
    example: NewsletterType.REGISTRATION,
  })
  @IsOptional()
  @IsEnum(NewsletterType)
  type?: NewsletterType;

  @ApiProperty({
    description: '🈵 발송대상자 리스트. 발송하려면 deduped studentIds 필요',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  studentIds?: number[] | null;

  @ApiProperty({
    description: '🈵 발송 대상 유형; SCHOOL, GRADE, LESSON, GROUP, STUDENT',
    example: NewsletterTarget.SCHOOL,
    enum: NewsletterTarget,
  })
  @IsOptional()
  @IsEnum(NewsletterTarget)
  target?: NewsletterTarget | null;

  @ApiProperty({
    description: '🈵 발송 대상 유형별 아이템 아이디',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  targetItems?: number[] | null;

  @ApiProperty({
    description: '🈵 발송 대상 유형 라벨',
    example: '1학년 전체',
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  targetLabel?: string | null;

  @ApiProperty({
    description: '🈳 발송예약 시각 (YYYY-MM-DD HH:mm:ss)',
    example: '2025-06-26T00:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: Date | null;

  @ApiProperty({
    description: '🈳 재발송예약 시각 (YYYY-MM-DD HH:mm:ss)',
    example: '2025-06-26T00:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  rescheduledAt?: Date | null;

  @ApiProperty({
    description: '🈵 발송 상태',
    enum: SendStatus,
    example: SendStatus.INIT,
  })
  @IsOptional()
  @IsEnum(SendStatus)
  status?: SendStatus;

  @ApiProperty({
    description: '🈵 알림 목록',
    type: [CreateNotificationDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateNotificationDto)
  notifications: CreateNotificationDto[];
}
