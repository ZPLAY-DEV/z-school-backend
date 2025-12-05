import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { IStoryQuestion } from 'src/common/interfaces';

class StoryQuestionDto implements IStoryQuestion {
  @ApiProperty({ description: '순서', example: 1 })
  @IsInt()
  @IsNotEmpty()
  id: number;

  @ApiProperty({ description: '질문', example: '질문1' })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({ description: '답변', example: '답변1' })
  @IsString()
  @IsNotEmpty()
  answer: string;
}

export class CreateStoryDto {
  @ApiProperty({ description: '🈵 weekId', example: 1 })
  @IsInt()
  @IsNotEmpty()
  weekId: number;

  @ApiProperty({ description: '🈵 주차수', example: 1 })
  @IsInt()
  @IsNotEmpty()
  weekNumber: number;

  @ApiProperty({ description: '🈵 제목', example: '전사 자세' })
  @IsString()
  @MaxLength(64)
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: '🈵 설명',
    example: '전사 자세에 대한 설명입니다',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: '🈵 설명',
    example: '전사 자세에 대한 설명입니다',
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  outro?: string;

  @ApiProperty({
    description: '🈳 스토리 상세',
    type: [StoryQuestionDto],
    example: [
      { id: 1, question: '질문1', answer: '답변1' },
      { id: 2, question: '질문2', answer: '답변2' },
    ],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoryQuestionDto)
  @IsOptional()
  questions?: IStoryQuestion[];

  @ApiProperty({
    description: '🈳 자막 배열',
    example: ['안녕하세요', '오늘은 전사 자세를 배워볼게요'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scripts?: string[];

  @ApiProperty({
    description: '🈳 이미지 URL',
    example: 'https://example.com/image.png',
    required: false,
  })
  @IsUrl()
  @MaxLength(255)
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    description: '🈳 오디오 URL',
    example: 'https://example.com/audio.mp3',
    required: false,
  })
  @IsUrl()
  @MaxLength(255)
  @IsOptional()
  audioUrl?: string;

  @ApiProperty({
    description: '🈳 비디오 URL',
    example: 'https://example.com/video.mp4',
    required: false,
  })
  @IsUrl()
  @MaxLength(255)
  @IsOptional()
  videoUrl?: string;
}
