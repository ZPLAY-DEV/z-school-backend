import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class CreateAutoPickDto {
  @ApiProperty({ description: '🈳 DB의 학교ID' })
  @IsInt()
  schoolId: number;

  @ApiProperty({ description: '🈳 DB의 학기ID' })
  @IsInt()
  termId: number;
}
