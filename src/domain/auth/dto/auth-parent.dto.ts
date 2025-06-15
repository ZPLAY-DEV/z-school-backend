import { Expose } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

export class AuthParentDto {
  @Expose()
  @IsNumber()
  id: number;

  @Expose()
  @IsString()
  name: string | null;

  @Expose()
  @IsString()
  phone: string | null;
}
