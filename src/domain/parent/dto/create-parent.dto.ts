import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateParentDto {
  @ApiProperty({
    description: '🈳 User ID. seed 데이터 생성시 비워야 함. 가입시에만 필요',
    example: 1,
    required: true,
    type: Number,
  })
  @IsOptional()
  @IsInt()
  userId?: number;

  @ApiPropertyOptional({
    description: '🈳 학부모 이름',
    example: '홍길동',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: '🈵 전화번호 (숫자만)',
    example: '01012345678',
    required: true,
    type: String,
  })
  @IsString()
  phone: string;

  @ApiProperty({
    description: '🈳 내용',
    example: '비고',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  note?: string;

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
