import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { NewsletterType } from 'src/common/enums';
import { SendNotifiableDto } from 'src/domain/notifiable/dto/send-notifiable.dto';

export class CreateNewsletterDto {
  @ApiProperty({ description: '🈵 schoolId', type: Number, example: 1 })
  @IsInt()
  schoolId: number;

  @ApiProperty({ description: '🈵 termId', type: Number, example: 1 })
  @IsInt()
  termId: number;

  @ApiProperty({ description: '🈵 notifiableId', type: Number, example: 1 })
  @IsInt()
  @IsOptional()
  notifiableId?: number | null;

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
    type: SendNotifiableDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SendNotifiableDto)
  send?: SendNotifiableDto;
}
