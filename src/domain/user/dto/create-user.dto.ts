import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';
import { DEFAULT_AVATAR_URL } from 'src/common/constants';
import { UserCredentialsDto } from 'src/domain/auth/dto/user-credentials.dto';

export class CreateUserDto extends UserCredentialsDto {
  @ApiPropertyOptional({ description: '🈳 username' })
  @IsOptional()
  @IsString()
  @Length(1, 32)
  username?: string;

  @ApiPropertyOptional({ description: '🈳 phone' })
  @IsEmail()
  @IsOptional()
  email?: string | null;

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

  @ApiPropertyOptional({ description: '🈳 refreshTokenHash' })
  @IsOptional()
  @IsString()
  refreshTokenHash?: string | null;
}
