import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
export class SignedUrlDto {
  @ApiProperty({ description: '🈵 mimeType', required: true })
  @IsString()
  mimeType: string;

  @ApiProperty({ description: '🈳 name', required: false })
  @IsString()
  @IsOptional()
  name?: string;
}
