import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from 'src/common/enums';

// Manager 로그인시 또는 Manager 회원가입시 사용
export class UserCredentialsDto {
  @ApiProperty({ description: '🈵 username' })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ description: '🈵 password' })
  @IsNotEmpty()
  @IsString()
  @MinLength(4)
  password: string;

  @ApiProperty({
    description: '🈵 사용자 역할 parent, instructor, manager, admin',
  })
  @IsNotEmpty()
  @IsEnum(Role)
  role: Role;
}

// Parent 또는 Instructor 회원가입 시 사용

export class UserCredentialsDtoWithPhone extends UserCredentialsDto {
  @ApiProperty({ description: '🈳 username (optional)' })
  @IsOptional()
  @IsString()
  declare username: string;

  @ApiProperty({ description: '🈵 phone' })
  @IsNotEmpty()
  @IsString()
  phone: string;
}
