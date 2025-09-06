import { Expose, Type } from 'class-transformer';
import { IsArray, IsNumber, IsString } from 'class-validator';
import { AuthSamDto } from 'src/domain/auth/dto/auth-sam.dto';

export class AuthInstructorDto {
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
  @Type(() => AuthSamDto)
  sams: AuthSamDto[];
}
