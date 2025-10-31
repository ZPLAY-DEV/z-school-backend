import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSyllabusDto {
  @ApiProperty({ description: '🈵 커리큘럼명', example: '요가 입문 커리큘럼' })
  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: '🈳 커리큘럼 설명',
    example: '초보자를 위한 요가 기초',
    required: false,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  description?: string;
}
