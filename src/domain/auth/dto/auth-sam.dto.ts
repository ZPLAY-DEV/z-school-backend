import { IsNumber, IsString } from 'class-validator';

export class AuthSamDto {
  @IsNumber()
  samId: number;

  @IsNumber()
  schoolId: number;

  @IsString()
  schoolName: string | null;
}
