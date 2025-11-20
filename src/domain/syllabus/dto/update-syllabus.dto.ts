import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ExerciseType, StudentLevel } from 'src/common/enums';
import { CreateWeekDto } from 'src/domain/week/dto/create-week.dto';
import { CreateSyllabusDto } from './create-syllabus.dto';

class UpdateProgramWithIdDto {
  @ApiProperty({
    description: '🈳 program ID (업데이트 시 필요)',
    required: false,
  })
  @IsInt()
  @IsOptional()
  id?: number;

  @ApiProperty({ description: '🈳 weekId', required: false })
  @IsInt()
  @IsOptional()
  weekId?: number;

  @ApiProperty({
    description: '🈳 zero based index (0도 유효한 값)',
    example: 0,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  index?: number;

  @ApiProperty({ description: '🈳 자세이름', required: false })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: '🈳 분류',
    enum: ExerciseType,
    required: false,
  })
  @IsEnum(ExerciseType)
  @IsOptional()
  type?: ExerciseType;

  @ApiProperty({
    description: '🈳 태그',
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[] | null;

  @ApiProperty({
    description: '🈳 난이도',
    enum: StudentLevel,
    required: false,
  })
  @IsEnum(StudentLevel)
  @IsOptional()
  level?: StudentLevel;

  @ApiProperty({
    description: '🈳 점수 측정 여부',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isScorable?: boolean;

  @ApiProperty({
    description: '🈳 자막 배열',
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  captions?: string[];

  @ApiProperty({
    description: '🈳 비디오 URL',
    required: false,
  })
  @IsUrl()
  @MaxLength(255)
  @IsOptional()
  videoUrl?: string;

  @ApiProperty({
    description: '🈳 오디오 URL',
    required: false,
  })
  @IsUrl()
  @MaxLength(255)
  @IsOptional()
  audioUrl?: string;
}

class UpdateWeekWithProgramsDto extends PartialType(CreateWeekDto) {
  @ApiProperty({
    description: '🈳 week ID (업데이트 시 필요)',
    required: false,
  })
  @IsInt()
  @IsOptional()
  id?: number;

  @ApiProperty({
    description: '🈳 programs',
    type: [UpdateProgramWithIdDto],
    required: false,
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateProgramWithIdDto)
  programs?: UpdateProgramWithIdDto[];
}

export class UpdateSyllabusDto extends PartialType(CreateSyllabusDto) {
  @ApiProperty({
    description: '🈳 weeks (nested with programs)',
    type: [UpdateWeekWithProgramsDto],
    required: false,
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateWeekWithProgramsDto)
  weeks?: UpdateWeekWithProgramsDto[];
}
