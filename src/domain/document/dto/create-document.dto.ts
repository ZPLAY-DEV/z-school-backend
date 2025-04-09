import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';
import { DocumentType } from 'src/common/enums';

export class CreateDocumentDto {
  @ApiProperty({
    description: '🈵 The type of document',
    enum: DocumentType,
    default: DocumentType.RESUME,
    example: DocumentType.RESUME,
  })
  @IsEnum(DocumentType)
  @IsNotEmpty()
  groupStatus: DocumentType;

  @ApiProperty({
    description: '🈵 The URL of the document',
    example: 'https://example.com/document.pdf',
  })
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @ApiProperty({
    description: '🈳 The ID of the instructor associated with this document',
    required: false,
  })
  @IsOptional()
  instructorId?: number;
}
