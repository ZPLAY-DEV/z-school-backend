import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { DocumentType } from 'src/common/enums';

export class CreateInstructorDto {
  @ApiProperty({
    description: '🈳 UserId',
    type: Number,
    example: 1,
  })
  @IsInt()
  userId: number;

  @ApiProperty({
    description: '🈳 강사 이름',
    example: '홍길동 --- 앱으로 가입한 강사의 이름',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  name?: string;

  @ApiProperty({
    description: '🈵 강사 전화번호 (숫자만 입력)',
    example: '01012345678 --- 앱으로 가입한 강사의 전화 번호',
    type: String,
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(16)
  phone: string;

  @ApiProperty({
    description: '🈳 내용',
    example: '특이사항 없음 --- 앱으로 가입한 강사의 비고',
    type: String,
    required: false,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  note?: string | null;

  @ApiProperty({
    description: '🈵 강사가 등록한 문서 타입들',
    example: ['RESUME', 'CERTIFICATE'],
    type: [String],
    enum: DocumentType,
    required: false,
  })
  @IsArray()
  @IsEnum(DocumentType, { each: true })
  @IsOptional()
  registeredDocuments?: DocumentType[];

  @ApiProperty({
    description: '🈳 Terms agreed date',
    example: '2025-01-01 --- 앱으로 가입한 강사가 약관동의한 시간',
    type: Date,
    required: false,
  })
  @IsOptional()
  termsAgreedAt?: Date;
}
