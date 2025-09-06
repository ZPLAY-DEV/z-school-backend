import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { AuthInstructorDto } from 'src/domain/auth/dto/auth-instructor.dto';
import { AuthManagerDto } from 'src/domain/auth/dto/auth-manager.dto';
import { AuthParentDto } from 'src/domain/auth/dto/auth-parent.dto';

//! @Expose() decorators are necessary for loginWithNanoid()
export class UserDto {
  @ApiProperty({ description: 'id' })
  @Expose()
  id: number;

  @ApiProperty({ description: 'username' })
  @Expose()
  username: string | null;

  @ApiProperty({ description: 'phone' })
  @Expose()
  phone: string | null;

  @ApiProperty({ description: 'email' })
  @Expose()
  email: string | null;

  @ApiProperty({ description: 'avatar' })
  @Expose()
  avatar: string | null;

  @ApiProperty({ description: 'createdAt' })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'manager',
    example: {
      id: 1,
      schoolId: 1,
      schoolName: null,
    },
  })
  @Expose()
  @Type(() => AuthManagerDto)
  manager: AuthManagerDto;

  @ApiProperty({
    description: 'instructor',
    example: {
      id: 1,
      name: 'John Doe',
      pushToken: '1234567890',
    },
  })
  @Expose()
  @Type(() => AuthInstructorDto)
  instructor: AuthInstructorDto;

  @ApiProperty({
    description: 'parent',
    example: {
      id: 1,
      name: 'John Doe',
      pushToken: '1234567890',
    },
  })
  @Expose()
  @Type(() => AuthParentDto)
  parent: AuthParentDto;

  constructor(data: Partial<UserDto>) {
    Object.assign(this, data);
  }
}
