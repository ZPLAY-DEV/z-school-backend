import { IsNumber, IsString } from 'class-validator';

export class AuthManagerDto {
  @IsNumber()
  id: number;

  @IsString()
  schoolId: number;

  @IsString()
  schoolName: string | null;
}
