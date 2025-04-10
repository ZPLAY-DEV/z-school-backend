import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDTO {
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

  @ApiProperty({ description: '액세스 토큰 만료 시간(초)', example: 3600 })
  expiresIn: number;

  constructor(data: Partial<AuthResponseDTO>) {
    Object.assign(this, data);
  }
}
