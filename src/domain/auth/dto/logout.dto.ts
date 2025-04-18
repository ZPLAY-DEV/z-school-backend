import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
export class LogoutDto {
  @ApiProperty({ description: 'refreshToken' })
  @IsOptional()
  @IsString()
  refreshToken?: string | null;
}
