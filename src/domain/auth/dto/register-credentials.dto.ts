import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Role } from 'src/common/enums';
import { CreateSchoolDto } from 'src/domain/school/dto/create-school.dto';

export class RegisterCredentialsDto {
  @ApiProperty({ description: '🈵 username', example: 'manager.kim' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ description: '🈵 phone', example: '01012345678' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: '🈵 password', example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  password: string;

  @ApiProperty({ description: '🈵 role', enum: Role, example: Role.PARENT })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({ description: '🈵 schoolId', example: 1 })
  @IsInt()
  @IsOptional()
  schoolId?: number;
}

export class RegisterManagerCredentialsDto {
  @ApiProperty({ description: '🈵 username', example: 'manager.kim' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: '🈵 password', example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  password: string;

  @ApiProperty({ description: '🈵 role', enum: Role, example: Role.PARENT })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiProperty({ description: '🈳 school' })
  @ValidateNested()
  @Type(() => CreateSchoolDto)
  school?: CreateSchoolDto;
}
