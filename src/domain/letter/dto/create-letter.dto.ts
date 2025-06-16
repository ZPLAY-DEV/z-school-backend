import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  EventStatus,
  LetterTarget,
  LetterType,
  SendMode,
} from 'src/common/enums';

export class CreateLetterDto {
  @ApiProperty({
    description: '🈵 School ID',
    type: Number,
    required: true,
  })
  @IsNotEmpty()
  @IsInt()
  schoolId: number;

  @ApiProperty({
    description: '🈵 Term ID',
    type: Number,
    required: true,
  })
  @IsNotEmpty()
  @IsInt()
  termId: number;

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
    description: '🈵 발송 유형',
    enum: LetterType,
    required: true,
  })
  @IsNotEmpty()
  @IsEnum(LetterType)
  type: LetterType;

  @ApiProperty({
    description: '🈵 발송 유형',
    enum: EventStatus,
    required: true,
  })
  @IsNotEmpty()
  @IsEnum(EventStatus)
  status: EventStatus;

  @ApiProperty({ description: '🈵 발송 대상 유형', required: true })
  @IsNotEmpty()
  @IsEnum(LetterTarget)
  targetGroup: LetterTarget;

  @ApiProperty({ description: '🈵 발송 대상 유형', required: true })
  @IsNotEmpty()
  @IsArray()
  @Type(() => String)
  targetGroupItems: string[];

  @ApiProperty({ description: '🈵 발송 대상 유형', required: true })
  @IsNotEmpty()
  @IsString()
  targetGroupLabel: string;

  @ApiProperty({
    description: '🈵 발송 대상자 ids',
    type: [Number],
    example: [1, 2, 3],
    required: true,
  })
  @IsNotEmpty()
  @IsArray()
  @IsInt({ each: true })
  ids: number[];

  @ApiProperty({ description: '🈵 전송 방식', enum: SendMode, required: true })
  @IsNotEmpty()
  @IsEnum(SendMode)
  sendMode: SendMode;

  @ApiProperty({
    description: '🈳 발송 시간 ( 즉시 발송 시 사용 )',
    example: '2025-06-05T00:30:00Z',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  sendAt?: Date | null;

  @ApiProperty({
    description: '🈳 예약 시간 ( 예약 발송 시 사용 )',
    example: '2025-06-05T00:30:00Z',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  scheduleAt?: Date | null;
}
