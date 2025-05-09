import { Expose } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

export class AuthInstructorDto {
  @IsNumber()
  @Expose()
  id: number;

  @IsString()
  @Expose()
  name: string | null;

  @IsString()
  @Expose()
  pushToken: string | null;
}
