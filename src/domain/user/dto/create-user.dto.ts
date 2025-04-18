import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { DEFAULT_AVATAR_URL } from 'src/common/constants';

export class CreateUserDto {
  @ApiProperty({ description: '🈵 username' })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiPropertyOptional({ description: '🈳 phone' })
  @IsString()
  @IsOptional()
  phone?: string | null;

  @ApiPropertyOptional({ description: '🈳 email' })
  @IsEmail()
  @IsOptional()
  email?: string | null;

  @ApiProperty({ description: '🈵 password' })
  @IsNotEmpty()
  @IsString()
  @MinLength(4)
  password: string;

  @ApiPropertyOptional({
    description: '🈳 avatar',
    default: DEFAULT_AVATAR_URL,
  })
  @IsOptional()
  @IsString()
  avatar?: string = DEFAULT_AVATAR_URL;

  @ApiPropertyOptional({ description: '🈳 pushToken' })
  @IsOptional()
  @IsString()
  pushToken?: string | null;
}
