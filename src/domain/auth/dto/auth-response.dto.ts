import { ApiProperty } from '@nestjs/swagger';
import { User } from 'src/domain/user/entities/user.entity';

export class AuthResponseDTO {
  @ApiProperty({
    description: '사용자 정보',
    example: '{ "id": 1, "username": "tester", "role": "parent", ... }',
    type: User,
  })
  user: User;

  // todo. Enum 문제 해결 후 String to Enum 변환
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

  //! 보안 이슈로 인해 리프레시 토큰 제거. refreshToken 쿠키 사용
  // @ApiProperty({
  //   description: '리프레시 토큰 (optional)',
  //   example: 'eyJhbGciOiJIUzI1NiIs...',
  //   type: String,
  // })
  // refreshToken?: string;

  @ApiProperty({ description: '액세스 토큰 만료 시간(초)', example: 3600 })
  expiresIn: number;

  constructor(data: Partial<AuthResponseDTO>) {
    Object.assign(this, data);
  }
}
