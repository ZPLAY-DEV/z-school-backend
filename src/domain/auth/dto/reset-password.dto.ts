import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';
export class ResetPasswordDto {
  @ApiProperty({ description: '🈵 전화번호' })
  @IsNotEmpty()
  @IsString()
  @Length(11, 11)
  @Matches(/^\d{11}$/, { message: '11-digit numeric string' })
  phone: string;

  @ApiProperty({ description: '🈵 비밀번호' })
  @IsNotEmpty()
  @IsString()
  @MinLength(4)
  password: string;
}
