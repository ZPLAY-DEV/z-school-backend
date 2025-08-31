import { IsNumber, IsString } from 'class-validator';

export class AuthParentDto {
  @IsNumber()
  id: number;

  @IsString()
  name: string | null;

  @IsString()
  phone: string | null;
}
