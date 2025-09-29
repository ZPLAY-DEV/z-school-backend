import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { SchoolInfo } from './school-info.dto';
import { UserDto } from './user.dto';

export class LoginResponseDto {
  @ApiProperty({ description: '요청 성공 여부', example: true })
  @Expose()
  success: boolean;

  @ApiProperty({
    description: '선택 가능한 학교 목록 (학교 선택이 필요한 경우에만)',
    type: [SchoolInfo],
    required: false,
  })
  @Expose()
  @Type(() => SchoolInfo)
  availableSchools?: SchoolInfo[];

  @ApiProperty({
    description: '사용자 정보 (로그인 완료된 경우에만)',
    type: UserDto,
    required: false,
  })
  @Expose()
  @Type(() => UserDto)
  user?: UserDto;

  @ApiProperty({
    description: '사용자 역할 (로그인 완료된 경우에만)',
    example: 'PARENT',
    required: false,
  })
  @Expose()
  role?: string;

  @ApiProperty({
    description: '액세스 토큰 (로그인 완료된 경우에만)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: false,
  })
  @Expose()
  accessToken?: string;

  @ApiProperty({
    description: '리프레시 토큰 (로그인 완료된 경우에만)',
    example: 'Z-123-P-abc123def456-L',
    required: false,
  })
  @Expose()
  refreshToken?: string;
}
