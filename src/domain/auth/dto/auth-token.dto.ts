import { ApiProperty } from '@nestjs/swagger';

export class AuthTokenDto {
  @ApiProperty({
    description: '액세스 토큰',
    example: 'eyJhbGciOiJIUzI1NiIs...',
    type: String,
  })
  accessToken: string;

  // @ApiProperty({
  //   description: '액세스 토큰 만료 시간',
  //   example: 1714416000,
  //   type: Number,
  // })
  // expiresAt: number;

  //! 보안 이슈로 인해 리프레시 토큰 제거. refreshToken 쿠키 사용
  // @ApiProperty({
  //   description: '리프레시 토큰 (optional)',
  //   example: 'eyJhbGciOiJIUzI1NiIs...',
  //   type: String,
  // })
  // refreshToken?: string;

  constructor(data: Partial<AuthTokenDto>) {
    Object.assign(this, data);
  }
}
