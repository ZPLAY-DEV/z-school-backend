import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString
} from 'class-validator';

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
    example: '홍길동',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: '🈵 강사 전화번호 (숫자만 입력)',
    example: '01012345678',
    type: String,
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({
    description: '🈳 내용',
    example: '비고',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  note?: string | null;

  @ApiProperty({
    description: '🈳 약관동의 시각',
    example: '2025-01-01T12:00:00Z',
    required: false,
    type: Date,
  })
  @IsOptional()
  @IsDate()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const dateStr = value.replace(' ', 'T');
      if (!dateStr.includes('T')) {
        return new Date(value);
      }
      if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
        return new Date(dateStr + 'Z');
      }
      return new Date(dateStr);
    }
    return value as Date;
  })
  termsAgreedAt?: Date;
}
