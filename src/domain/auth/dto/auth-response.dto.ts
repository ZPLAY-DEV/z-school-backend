import { ApiProperty } from '@nestjs/swagger';
import { User } from 'src/domain/user/entities/user.entity';

export class AuthResponseDto {
  @ApiProperty({
    description: '사용자 정보',
    example: '{ "id": 1, "username": "tester", ... }',
    type: User,
  })
  user: User;

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

  constructor(data: Partial<AuthResponseDto>) {
    Object.assign(this, data);
  }
}
