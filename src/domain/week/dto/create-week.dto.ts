import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateProgramDto } from 'src/domain/program/dto/create-program.dto';
import { CreateStoryDto } from 'src/domain/story/dto/create-story.dto';

export class CreateWeekDto {
  @ApiProperty({ description: '🈵 syllabusId', example: 1 })
  @IsInt()
  @IsOptional()
  syllabusId?: number;

  @ApiProperty({ description: '🈵 주차', example: 1 })
  @IsInt()
  @IsOptional()
  weekNumber?: number;

  @ApiProperty({ description: '🈵 주제', example: '척추 건강' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  subject?: string;

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
}

export class CreateWeekWithProgramsDto extends CreateWeekDto {
  @ApiProperty({ description: '🈵 programs', type: [CreateProgramDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProgramDto)
  programs: CreateProgramDto[];
}

export class CreateWeekWithStoryDto extends CreateWeekDto {
  @ApiProperty({ description: '🈵 story', type: CreateStoryDto })
  @ValidateNested()
  @Type(() => CreateStoryDto)
  story: CreateStoryDto;
}
export class CreateWeekWithProgramsAndStoryDto extends CreateWeekDto {
  @ApiProperty({ description: '🈵 programs', type: [CreateProgramDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProgramDto)
  programs: CreateProgramDto[];

  @ApiProperty({ description: '🈵 story', type: CreateStoryDto })
  @ValidateNested()
  @Type(() => CreateStoryDto)
  story: CreateStoryDto;
}
