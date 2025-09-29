import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { Role } from 'src/common/enums';

export class SwitchSchoolDto {
  @ApiProperty({
    description: 'Role to switch to',
    enum: Role,
    example: Role.PARENT,
  })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({
    description: 'School ID to switch to (null for no school)',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  schoolId?: number | null;
}
