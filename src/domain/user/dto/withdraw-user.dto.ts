import { IsEnum } from '@nestjs/class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Role } from 'src/common/enums';
export class WithdrawUserDto {
  @ApiProperty({ description: 'role' })
  @IsEnum(Role)
  role: Role = Role.PARENT;

  @ApiProperty({ description: '현재 비밀번호' })
  @IsString()
  current: string;

  @ApiProperty({ description: '탈퇴사유' })
  @IsString()
  @IsOptional()
  reason?: string;
}
