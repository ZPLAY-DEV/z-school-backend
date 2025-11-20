import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateSyllabusDto {
  @ApiProperty({
    description: '🈵 slug (고유 식별자, URL-safe)',
    example: 'beginner-yoga',
  })
  @IsString()
  @MaxLength(32)
  @Matches(/^[a-z0-9가-힣ㄱ-ㅎㅏ-ㅣ._-]+$/, {
    message:
      'slug는 영문 소문자, 숫자, 한글, 하이픈(-), 언더바(_), 마침표(.)만 사용 가능합니다 (예: beginner-yoga)',
  })
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ description: '🈵 주차수', example: 4 })
  @IsInt()
  @IsOptional()
  weekCount?: number;

  @ApiProperty({ description: '🈵 커리큘럼명', example: '요가 입문 커리큘럼' })
  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: '🈳 커리큘럼 설명',
    example: '초보자를 위한 요가 기초',
    required: false,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  description?: string;
}
