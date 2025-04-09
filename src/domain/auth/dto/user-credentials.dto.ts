import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';
import { Role } from 'src/common/enums';
export class UserCredentialsDto {
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

  @ApiProperty({
    description: '🈵 사용자 역할 parent, instructor, manager, admin',
  })
  @IsNotEmpty()
  @IsEnum(Role)
  role: Role;
}
