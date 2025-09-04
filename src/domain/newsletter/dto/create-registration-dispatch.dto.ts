import { MaxLength } from '@nestjs/class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsDate, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateRegistrationDispatchDto {
  @ApiProperty({ description: '🈵 schoolId', type: Number, example: 1 })
  @IsInt()
  schoolId: number;

  @ApiProperty({ description: '🈵 termId', type: Number, example: 1 })
  @IsInt()
  termId: number;

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
  body?: string;

  @ApiProperty({ description: '🈵 첨부 파일 URL', type: [String] })
  @IsArray()
  images: string[];

  @ApiProperty({
    description: '🈳 발송 예약 시각 (YYYY-MM-DD HH:mm:ss)',
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
}
