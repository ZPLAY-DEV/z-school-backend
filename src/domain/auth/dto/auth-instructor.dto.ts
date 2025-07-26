import { Expose, Type } from 'class-transformer';
import { IsArray, IsNumber, IsString } from 'class-validator';
import { AuthSamDto } from 'src/domain/auth/dto/auth-sam.dto';

export class AuthInstructorDto {
  @IsNumber()
  @Expose()
  id: number;

  @IsString()
  @Expose()
  name: string | null;

  @IsString()
  @Expose()
  phone: string | null;

  @IsArray()
  @Expose()
  @Type(() => AuthSamDto)
  sams: AuthSamDto[];
}
