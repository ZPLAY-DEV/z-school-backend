import { ApiProperty } from '@nestjs/swagger';
import { DocumentType } from 'src/common/enums';

export class DocumentResponseDto {
  @ApiProperty({
    description: '문서 ID',
    example: '1 --- 제출한 서류의 id',
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: '강사 ID',
    example: '1 --- 학교에 속한 강사의 id ( samId )',
    type: Number,
  })
  samId: number;

  @ApiProperty({
    description: '학교 ID',
    example: '1 --- 학교의 id ( schoolId )',
    type: Number,
  })
  schoolId: number;

  @ApiProperty({
    description: '문서 타입',
    example: '이력서 --- 제출한 서류의 타입 ( RESUME, CERTIFICATE, ETC )',
    enum: DocumentType,
  })
  documentType: DocumentType;

  @ApiProperty({
    description: '문서 URL',
    example:
      'https://cdn.scoollink.com/documents/이력서.png --- 제출한 서류의 url',
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
