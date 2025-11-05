import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IStoryDetail } from 'src/common/interfaces';

export class CreateWeekDto {
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

  @ApiProperty({
    description: '🈳 게임',
    example: '게임명',
    required: false,
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  game?: string;

  @ApiProperty({
    description: '🈳 게임 상세',
    example: {},
    required: false,
  })
  @IsOptional()
  gameDetail?: Record<string, any>;

  @ApiProperty({
    description: '🈳 스토리',
    example: '스토리명',
    required: false,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  story?: string;

  @ApiProperty({
    description: '🈳 스토리 상세',
    example: {},
    required: false,
  })
  @IsOptional()
  storyDetail?: IStoryDetail;
}
