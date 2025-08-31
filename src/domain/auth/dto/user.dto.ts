import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AuthInstructorDto } from 'src/domain/auth/dto/auth-instructor.dto';
import { AuthManagerDto } from 'src/domain/auth/dto/auth-manager.dto';
import { AuthParentDto } from 'src/domain/auth/dto/auth-parent.dto';

export class UserDto {
  @ApiProperty({ description: 'id' })
  user: number;

  @ApiProperty({ description: 'username' })
  username: string | null;

  @ApiProperty({ description: 'phone' })
  phone: string | null;

  @ApiProperty({ description: 'email' })
  email: string | null;

  @ApiProperty({ description: 'avatar' })
  avatar: string | null;

  @ApiProperty({ description: 'createdAt' })
  createdAt: Date;

  @ApiProperty({
    description: 'manager',
    example: {
      id: 1,
      schoolId: 1,
      schoolName: null,
    },
  })
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
  @Type(() => AuthParentDto)
  parent: AuthParentDto;

  constructor(data: Partial<UserDto>) {
    Object.assign(this, data);
  }
}
