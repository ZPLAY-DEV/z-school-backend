import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Actor, Weekday } from 'src/common/enums';

export class CreateSchooldayDto {
  @ApiPropertyOptional({ description: 'schoolId', example: 1 })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  schoolId?: number;

  @ApiPropertyOptional({ description: 'termId', example: 1 })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  termId?: number;

  @ApiPropertyOptional({ description: 'lessonId', example: 1 })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  lessonId?: number;

  @ApiPropertyOptional({ description: 'groupId', example: 1 })
  @IsInt()
  @Type(() => Number)
  groupId: number;

  @ApiPropertyOptional({ description: 'name', example: '과목명' })
  @IsString()
  @MaxLength(16)
  name: string;

  @ApiProperty({
    description: '수업 요일',
    enum: Weekday,
    example: Weekday.MONDAY,
  })
  @IsEnum(Weekday)
  weekday: Weekday;

  @ApiProperty({ description: '주차', example: 1 })
  @IsInt()
  @Type(() => Number)
  weekNumber: number;

  @ApiProperty({
    description: '검색용 날짜',
    example: '2025-07-16',
  })
  @IsString()
  @MaxLength(10)
  today: string;

  @ApiProperty({
    description: '원래 수업일 (불변)',
    example: '2025-07-16',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  initial: string;

  @ApiProperty({
    description: '이전 수업일',
    example: '2025-07-16',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  original?: string | null;

  @ApiProperty({ description: '시작시각 (DateTime)' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  startsAt?: Date;

  @ApiProperty({ description: '종료시각 (DateTime)' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endsAt?: Date;

  @ApiPropertyOptional({ description: '수업시간 분단위' })
  @IsInt()
  @Type(() => Number)
  duration: number;

  @ApiProperty({
    description: '수업 종료일 등록 주체 (INSTRUCTOR, MANAGER, OTHER)',
    example: 'MANAGER',
    enum: Actor,
  })
  @IsEnum(Actor)
  @IsOptional()
  updatedBy?: Actor;

  @ApiPropertyOptional({ description: '비고' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string | null;

  @ApiProperty({
    description: '🈳 시작 알림 시각 (YYYY-MM-DD HH:mm:ss)',
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
  startNotifiedAt?: Date | null;

  @ApiProperty({
    description: '🈳 종료 알림 시각 (YYYY-MM-DD HH:mm:ss)',
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
  endNotifiedAt?: Date | null;
}
