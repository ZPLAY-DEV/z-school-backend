import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreatePhoneDto {
  @ApiPropertyOptional({
    description: '🈳 학교에서 관리하는 발송 번호 (숫자만 입력)',
    example: '01012345678',
    maxLength: 16,
  })
  @IsString()
  @MaxLength(16)
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({
    description: '🈳 DB의 학교ID',
    example: 1,
  })
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  schoolId: number;
}
