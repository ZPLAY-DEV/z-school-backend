import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Role } from 'src/common/enums';
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

export class UserCredentialsDtoWithPhone extends UserCredentialsDto {
  @ApiProperty({ description: '🈵 phone' })
  @IsNotEmpty()
  @IsString()
  phone: string;
}
