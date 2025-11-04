import { Expose, Type } from 'class-transformer';
import { IsArray, IsNumber, IsString } from 'class-validator';
import { AuthStudentDto } from 'src/domain/auth/dto/auth-student.dto';

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

  @Expose()
  @IsArray()
  @Type(() => AuthStudentDto)
  students: AuthStudentDto[];
}
