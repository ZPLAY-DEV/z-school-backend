import { Expose } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

export class AuthManagerDto {
  @Expose()
  @IsNumber()
  id: number;

  @Expose()
  @IsString()
  schoolId: number;

  @Expose()
  @IsString()
  schoolName: string | null;
}
