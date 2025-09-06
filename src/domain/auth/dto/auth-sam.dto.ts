import { Expose } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

export class AuthSamDto {
  @Expose()
  @IsNumber()
  samId: number;

  @Expose()
  @IsNumber()
  schoolId: number;

  @Expose()
  @IsString()
  schoolName: string | null;
}
