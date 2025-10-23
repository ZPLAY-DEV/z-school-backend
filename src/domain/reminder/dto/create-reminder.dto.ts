import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { SendNotifiableDto } from 'src/domain/notifiable/dto/send-notifiable.dto';

export class CreateReminderDto {
  @ApiProperty({ description: '🈵 schoolId', type: Number, example: 1 })
  @IsNumber()
  schoolId: number;

  @ApiProperty({ description: '🈵 termId', type: Number, example: 1 })
  @IsNumber()
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
    type: SendNotifiableDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SendNotifiableDto)
  send?: SendNotifiableDto;
}
