import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class UpdateUserOtpDto extends PartialType(CreateUserDto) {
  @ApiProperty({ description: 'OTP' })
  @IsNotEmpty()
  @IsString()
  otp: string;

  @ApiProperty({ description: 'role' })
  @IsNotEmpty()
  @IsString()
  role: string; // PARENT or INSTRUCTOR
}
