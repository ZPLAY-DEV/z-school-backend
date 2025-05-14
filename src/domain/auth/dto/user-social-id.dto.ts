import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Role } from 'src/common/enums';
export class UserSocialIdDto {
  @ApiProperty({ description: '이메일' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: '소셜인증 업체명' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(16)
  providerName: string;

  @ApiProperty({ description: '소셜 아이디' })
  @IsNotEmpty()
  @IsString()
  providerId: string;

  @ApiProperty({ description: '이름', default: null })
  @IsString()
  @IsOptional()
  name?: string | null;

  @ApiProperty({ description: '전화번호', default: null })
  @IsString()
  @IsOptional()
  phone?: string | null;

  @ApiProperty({ description: '사진', default: null })
  @IsString()
  @IsOptional()
  photo?: string | null;

  @ApiProperty({ description: '성별', default: null })
  @IsString()
  @IsOptional()
  gender?: string | null;

  @ApiProperty({ description: '생일', default: null })
  @IsString()
  @IsOptional()
  dob?: string | null;

  @ApiProperty({ description: '소셜 로그인시 role 전달하기 위해 추가' })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
