import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateNanoIdDto {
  @ApiProperty({
    description: '🈳 parent ID',
    required: false,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  parentId?: number;

  @ApiPropertyOptional({
    description: '🈳 학부모 전화번호',
    required: false,
    type: String,
  })
  @IsString()
  @IsOptional()
  @MaxLength(16)
  phone?: string;

  @ApiProperty({
    description: '🈳 나노아이디의 유효기간 ( 예: 1d, 1h, 1m, 1s )',
    type: Date,
  })
  @IsString()
  validity?: string;

  @ApiPropertyOptional({
    description: '🈳 라우팅 정보',
    required: false,
    type: String,
  })
  @IsString()
  @IsOptional()
  target?: string;

  @ApiPropertyOptional({
    description: '🈳 라우팅 부가 args 정보',
    required: false,
    type: String,
  })
  @IsString()
  @IsOptional()
  targetArgs?: string;
}
