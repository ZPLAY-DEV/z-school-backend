import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';

export class GenerateS3UrlsDto {
  @ApiProperty({
    description: '학교 ID',
    example: 1,
  })
  @IsInt()
  schoolId: number;

  @ApiProperty({
    description: '학기 ID',
    example: 1,
  })
  @IsInt()
  termId: number;

  @ApiProperty({
    description: '파일 MIME 타입',
    example: 'image/jpeg',
  })
  @IsString()
  mimeType: string;
}
