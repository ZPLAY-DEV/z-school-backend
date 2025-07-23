import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';

export class CreateRegistrationNewsletterDto {
  @ApiProperty({ description: '🈵 schoolId', type: Number, example: 1 })
  @IsInt()
  schoolId: number;

  @ApiProperty({ description: '🈵 termId', type: Number, example: 1 })
  @IsInt()
  termId: number;

  @ApiProperty({ description: '🈵 첨부 파일 URL', type: [String] })
  @IsArray()
  images: string[];
}
