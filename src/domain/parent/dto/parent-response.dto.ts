import { ApiProperty } from '@nestjs/swagger';

export class ParentResponseDto {
  @ApiProperty({ description: '학부모 ID', example: 8, type: Number })
  id: number;
  @ApiProperty({ description: '학부모 이름', example: '홍길동', type: String })
  name: string;
  @ApiProperty({
    description: '학부모 전화번호',
    example: '01012345678',
    type: String,
  })
  phone: string;
  @ApiProperty({ description: '학부모 플랫폼', example: 'web', type: String })
  platform: string;
  @ApiProperty({
    description: '학부모 pushToken',
    example: '1234567890',
    type: String,
  })
  pushToken: string;
  @ApiProperty({
    description: '학부모 비고',
    example: '블라블라',
    type: String,
  })
  note: string;
  @ApiProperty({
    description: '학부모 약관동의 시간',
    example: '2025-05-08T02:27:20.321Z',
    type: String,
  })
  termsAgreedAt: string;
  @ApiProperty({
    description: '학부모 생성 시간',
    example: '2025-05-08T02:27:20.321Z',
    type: String,
  })
  createdAt: string;
  @ApiProperty({
    description: '학부모 수정 시간',
    example: '2025-05-08T02:27:20.321Z',
    type: String,
  })
  updatedAt: string;
}
