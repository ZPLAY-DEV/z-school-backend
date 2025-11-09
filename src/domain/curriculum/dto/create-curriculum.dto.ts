import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';

export class CreateCurriculumDto {
  @ApiProperty({ description: '🈵 lessonId', example: 1 })
  @IsInt()
  @IsNotEmpty()
  lessonId: number;

  @ApiProperty({ description: '🈵 syllabusId', example: 1 })
  @IsInt()
  @IsNotEmpty()
  syllabusId: number;

  @ApiProperty({ description: '🈵 termId', example: 1 })
  @IsInt()
  @IsNotEmpty()
  termId: number;

  @ApiProperty({ description: '🈵 schoolId', example: 1 })
  @IsInt()
  @IsNotEmpty()
  schoolId: number;

  // @ApiProperty({
  //   description: '🈳 학교명',
  //   example: '홍익대학교 사범대학 부속 초등학교',
  //   required: false,
  // })
  // @IsString()
  // @MaxLength(24)
  // @IsOptional()
  // schoolName?: string;
}
