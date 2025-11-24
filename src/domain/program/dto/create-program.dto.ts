import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ExerciseType, Orientation, StudentLevel } from 'src/common/enums';

export class CreateProgramDto {
  @ApiProperty({ description: '🈵 weekId', example: 1 })
  @IsInt()
  @IsOptional()
  weekId?: number;

  @ApiProperty({ description: '🈵 주차', example: 1 })
  @IsInt()
  @IsOptional()
  weekNumber?: number;

  @ApiProperty({ description: '🈵 zero based index', example: 0 })
  @IsInt()
  @IsNotEmpty()
  index: number;

  @ApiProperty({ description: '🈵 자세이름', example: 'korean name' })
  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '🈵 자세이름', example: 'english identifier' })
  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  slug: string;

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
    example: '팔,다리,허리,골반,척추',
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  tags: string[] | null;

  @ApiProperty({
    description: '🈵 난이도',
    enum: Orientation,
    example: Orientation.CENTER,
  })
  @IsEnum(Orientation)
  @IsOptional()
  orientation?: Orientation;

  @ApiProperty({
    description: '🈵 난이도',
    enum: StudentLevel,
    example: StudentLevel.JUNIOR,
  })
  @IsEnum(StudentLevel)
  @IsNotEmpty()
  level: StudentLevel;

  @ApiProperty({
    description: '🈵 점수 측정 여부',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isScorable: boolean;

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
  imageUrl?: string | null;

  @ApiProperty({
    description: '🈳 비디오 URL',
    example: 'https://example.com/video.mp4',
    required: false,
  })
  @IsUrl()
  @MaxLength(255)
  @IsOptional()
  videoUrl?: string | null;

  @ApiProperty({
    description: '🈳 오디오 URL',
    example: 'https://example.com/audio.mp3',
    required: false,
  })
  @IsUrl()
  @MaxLength(255)
  @IsOptional()
  audioUrl?: string | null;
}
