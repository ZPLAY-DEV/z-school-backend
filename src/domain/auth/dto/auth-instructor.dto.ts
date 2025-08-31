import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsString } from 'class-validator';
import { AuthSamDto } from 'src/domain/auth/dto/auth-sam.dto';

export class AuthInstructorDto {
  @IsNumber()
  id: number;

  @IsString()
  name: string | null;

  @IsString()
  phone: string | null;

  @IsArray()
  @Type(() => AuthSamDto)
  sams: AuthSamDto[];
}
