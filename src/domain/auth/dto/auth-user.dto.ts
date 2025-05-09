import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from 'src/domain/auth/dto/user.dto';

export class AuthUserDto {
  @ApiProperty({
    description: '사용자 정보',
    // example: '{ "id": 1, "username": "tester", ... }',
    type: UserDto,
  })
  user: UserDto;

  @ApiProperty({
    description: '사용자 역할',
    example: 'PARENT',
    type: String,
  })
  role: string;

  @ApiProperty({
    description: '액세스 토큰',
    example: 'eyJhbGciOiJIUzI1NiIs...',
    type: String,
  })
  accessToken: string;

  @ApiProperty({
    description: '리프레시 토큰 (optional)',
    example: 'eyJhbGciOiJIUzI1NiIs...',
    type: String,
  })
  refreshToken?: string;

  // @ApiProperty({
  //   description: '액세스 토큰 만료 시간',
  //   example: 1714416000,
  //   type: Number,
  // })
  // expiresAt: number;

  constructor(data: Partial<AuthUserDto>) {
    Object.assign(this, data);
  }
}
