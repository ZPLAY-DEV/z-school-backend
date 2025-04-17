import { ApiProperty } from '@nestjs/swagger';

export class RefreshResponseDto {
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

  // @ApiProperty({ description: '액세스 토큰 만료 시간(초)', example: 3600 })
  // expiresAt: number;

  constructor(data: Partial<RefreshResponseDto>) {
    Object.assign(this, data);
  }
}
