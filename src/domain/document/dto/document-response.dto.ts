import { ApiProperty } from '@nestjs/swagger';
import { DocumentType } from 'src/common/enums';

export class DocumentResponseDto {
  @ApiProperty({ description: '문서 ID', example: 1, type: Number })
  id: number;

  @ApiProperty({ description: '강사 ID', example: 1, type: Number })
  instructorId: number;

  @ApiProperty({ description: '학교 ID', example: 1, type: Number })
  schoolId: number;

  @ApiProperty({
    description: '문서 타입',
    example: '이력서',
    enum: DocumentType,
  })
  documentType: DocumentType;

  @ApiProperty({
    description: '문서 URL',
    example: 'https://cdn.scoollink.com/documents/이력서.png',
    type: String,
  })
  url: string;

  @ApiProperty({
    description: '생성일',
    example: '2025-05-12T09:29:39.364Z',
    type: Date,
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정일',
    example: '2025-05-12T09:29:39.364Z',
    type: Date,
  })
  updatedAt: Date;
}
