import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class SyncCurriculumDto {
  @ApiProperty({ description: '🈵 syllabusId', example: 1 })
  @IsInt()
  syllabusId: number;

  @ApiProperty({ description: '🈵 termId', example: 1 })
  @IsInt()
  termId: number;

  @ApiProperty({ description: '🈵 schoolId', example: 1 })
  @IsInt()
  schoolId: number;

  // @ApiProperty({
  //   description: '🈳 학교명',
  //   example: '홍익대학교 사범대학 부속 초등학교',
  //   required: false,
  // })
  // @IsString()
  // @MaxLength(24)
  // @IsOptional()
  // schoolName?: string | null;
}
