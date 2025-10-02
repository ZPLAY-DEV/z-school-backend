import { Expose } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

export class AuthAffiliationDto {
  @Expose()
  @IsNumber()
  managerId: number;

  @Expose()
  @IsNumber()
  schoolId: number;

  @Expose()
  @IsString()
  schoolName: string | null;
}
