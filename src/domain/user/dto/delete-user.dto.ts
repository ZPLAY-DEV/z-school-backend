import { IsEnum } from '@nestjs/class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Role } from 'src/common/enums';
export class DeleteUserDto {
  @ApiProperty({ description: 'role' })
  @IsEnum(Role)
  role: Role = Role.PARENT;

  @ApiProperty({ description: '탈퇴사유' })
  @IsString()
  @IsOptional()
  reason?: string;
}
