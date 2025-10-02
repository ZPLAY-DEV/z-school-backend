import { Expose, Type } from 'class-transformer';
import { IsArray, IsNumber, IsString } from 'class-validator';
import { AuthAffiliationDto } from 'src/domain/auth/dto/auth-affiliation.dto';

export class AuthManagerDto {
  @Expose()
  @IsNumber()
  id: number;

  @Expose()
  @IsString()
  name: string | null;

  @Expose()
  @IsString()
  phone: string | null;

  @Expose()
  @IsArray()
  @Type(() => AuthAffiliationDto)
  affiliations: AuthAffiliationDto[];
}
