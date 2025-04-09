import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
export class FirebaseUserDto {
  @ApiProperty({ description: '이메일' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: '전화번호' })
  @IsString()
  @IsOptional()
  phone: string | null;

  @ApiProperty({ description: '이미지 URL' })
  @IsString()
  @IsOptional()
  photoURL: string | null;

  @ApiProperty({ description: 'UID' })
  @IsNotEmpty()
  @IsString()
  uid: string;

  //! whatsupkorea 전용 코드
  @ApiProperty({ description: '초대한 사용자의 Id' })
  @IsNumber()
  @IsOptional()
  inviterId: number | null;
}
