import { Expose } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

export class AuthStudentDto {
  @Expose({ name: 'id' })
  @IsNumber()
  id: number;

  @Expose()
  @IsNumber()
  grade: number;

  @Expose()
  @IsString()
  klass: string;

  @Expose()
  @IsNumber()
  bunho: number;

  @Expose()
  @IsString()
  name: string | null;

  @Expose()
  @IsString()
  avatarUrl: string | null;

  @Expose()
  @IsNumber()
  schoolId: number;

  @Expose()
  @IsString()
  schoolName: string | null;
}
