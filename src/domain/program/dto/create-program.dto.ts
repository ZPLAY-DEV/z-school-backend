import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ExerciseType, StudentLevel } from 'src/common/enums';

export class CreateProgramDto {
  @ApiProperty({ description: '🈵 syllabusId', example: 1 })
  @IsInt()
  @IsNotEmpty()
  syllabusId: number;

  @ApiProperty({ description: '🈵 주차', example: 1 })
  @IsInt()
  @Min(1)
  @Max(255)
  @IsNotEmpty()
  week: number;

  @ApiProperty({ description: '🈵 주제', example: '척추 건강' })
  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ description: '🈵 자세이름', example: '전사 자세' })
  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: '🈵 분류',
    enum: ExerciseType,
    example: ExerciseType.MEDITATION,
  })
  @IsEnum(ExerciseType)
  @IsNotEmpty()
  type: ExerciseType;

  @ApiProperty({
    description: '🈳 태그',
    example: '초급,기초,척추',
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  tags: string[] | null;

  @ApiProperty({
    description: '🈵 난이도',
    enum: StudentLevel,
    example: StudentLevel.JUNIOR,
  })
  @IsEnum(StudentLevel)
  @IsNotEmpty()
  level: StudentLevel;

  @ApiProperty({
    description: '🈳 자막 배열',
    example: ['안녕하세요', '오늘은 전사 자세를 배워볼게요'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  captions?: string[];

  @ApiProperty({
    description: '🈳 비디오 URL',
    example: 'https://example.com/video.mp4',
    required: false,
  })
  @IsUrl()
  @MaxLength(255)
  @IsOptional()
  videoUrl?: string;

  @ApiProperty({
    description: '🈳 오디오 URL',
    example: 'https://example.com/audio.mp3',
    required: false,
  })
  @IsUrl()
  @MaxLength(255)
  @IsOptional()
  audioUrl?: string;
}
