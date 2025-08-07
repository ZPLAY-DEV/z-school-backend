import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { DEFAULT_AVATAR_URL } from 'src/common/constants';
import { Role } from 'src/common/enums';

export class CreateUserDto {
  @ApiProperty({ description: '🈵 username' })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiPropertyOptional({ description: '🈳 phone' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: '🈳 email' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: '🈵 password' })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: '🈳 role', default: Role.PARENT })
  @IsEnum(Role)
  @IsOptional()
  role?: Role = Role.PARENT;

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
