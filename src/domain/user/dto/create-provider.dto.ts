import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';
export class CreateProviderDto {
  @ApiProperty({ description: '🈳 소셜로그인 제공자', required: false })
  @IsString()
  providerName: string;

  @ApiProperty({ description: '🈳 소셜로그인 아이디', required: false })
  @IsString()
  providerId: string;

  @ApiProperty({ description: '🈳 사용자 아이디', required: false })
  @IsNumber()
  userId: number;
}
