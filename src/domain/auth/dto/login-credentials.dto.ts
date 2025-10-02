import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from 'src/common/enums';

export class LoginCredentialsDto {
  @ApiProperty({
    description: '🈵 username (email or phone)',
    example: 'user@example.com',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: '🈵 password', example: 'password123' })
  @IsNotEmpty()
  @IsString()
  @MinLength(4)
  password: string;

  @ApiProperty({ description: '🈵 role', enum: Role, example: Role.PARENT })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({
    description: '🈵 schoolId for multi-tenancy (required for login)',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  schoolId?: number;
}
