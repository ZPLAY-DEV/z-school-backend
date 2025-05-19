import { ApiProperty } from '@nestjs/swagger';

export class GenerateS3UrlResponseDto {
  @ApiProperty({
    description: 'Presigned URL',
    example: 'https://s3.amazonaws.com/bucket-name/key-name',
  })
  uploadUrl: string;

  @ApiProperty({
    description: 'uploadUrl로 업로드 후 반환되는 이미지 URL',
    example: 'https://s3.cdn.com/bucket-name/key-name',
  })
  imageUrl: string;
}
