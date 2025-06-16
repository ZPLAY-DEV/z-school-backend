import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDate, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateNanoidDto {
  @ApiProperty({
    description: '🈳 parent ID',
    type: Number,
  })
  @IsNumber()
  parentId: number;

  @ApiPropertyOptional({
    description: '🈳 학부모 전화번호',
    type: String,
  })
  @IsString()
  nanoid: string;

  @ApiPropertyOptional({
    description: '🈳 학부모 전화번호',
    type: String,
  })
  @IsString()
  phone: string;

  @ApiPropertyOptional({
    description: '🈳 라우팅 page 정보',
    required: false,
    type: String,
  })
  @IsString()
  @IsOptional()
  page?: string;

  @ApiPropertyOptional({
    description: '🈳 라우팅 부가 args 정보',
    required: false,
    type: String,
  })
  @IsString()
  @IsOptional()
  args?: string;

  @ApiProperty({
    description: '🈳 나노아이디의 유효기간',
    type: Date,
  })
  @IsDate()
  expiresAt: Date;
}
