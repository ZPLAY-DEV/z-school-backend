import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { NewsletterTarget } from 'src/common/enums';
import { SendStatus } from 'src/common/enums/send-status';

export class CreateDispatchDto {
  @ApiProperty({
    description: '🈵 발송할 뉴스레터의 Term ID',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  termId?: number;

  @ApiProperty({
    description: '🈵 발송할 뉴스레터의 ID',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  newsletterId?: number;

  @ApiProperty({
    description: '🈵 발송 대상 유형 (SCHOOL, GRADE, LESSON, GROUP, STUDENT)',
    enum: NewsletterTarget,
    example: NewsletterTarget.SCHOOL,
    required: false,
  })
  @IsOptional()
  @IsEnum(NewsletterTarget)
  target?: NewsletterTarget;

  @ApiProperty({
    description: '🈳 발송 대상 ID 배열 (target에 따른 학년/강좌/학생 ID들)',
    type: [Number],
    example: [1, 2, 3],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  targetItems?: number[];

  @ApiProperty({
    description: '🈳 발송 대상 표시명 (예: "1, 2학년", "미술반 A, B조")',
    example: '1, 2학년',
    required: false,
  })
  @IsOptional()
  @IsString()
  targetLabel?: string;

  @ApiProperty({
    description: '🈳 알림 서비스에 전달할 발송 데이터 (시스템 내부용)',
    example: {
      type: 'newsletter',
      schoolId: 1,
      role: 'parent',
      messages: [],
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  payload?: {
    type: string;
    schoolId: number;
    role: string;
    messages: any[];
  };

  @ApiProperty({
    description: '🈳 발송 예약 시각 (null이면 즉시 발송)',
    example: '2025-06-26T00:30:00Z',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      // "YYYY-MM-DD HH:mm:ss" 형식이면 ISO 형식으로 변환
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

  @ApiProperty({
    description:
      '🈵 뉴스레터 발송 상태 (INIT, READY, SCHEDULED, SENT, CANCELLED)',
    enum: SendStatus,
    example: SendStatus.INIT,
    required: false,
  })
  @IsOptional()
  @IsEnum(SendStatus)
  status?: SendStatus;
}
