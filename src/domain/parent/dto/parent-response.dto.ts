import { ApiProperty } from '@nestjs/swagger';

export class ParentResponseDto {
  @ApiProperty({
    description: '학부모 ID',
    example: '1 --- 학부모의 id',
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: '학부모 User ID',
    example: '1 --- 학부모 앱으로 가입한 User ID',
    type: Number,
  })
  userId: number | null;

  @ApiProperty({
    description: '학부모 이름',
    example: '홍길동 --- 학부모 이름',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: '학부모 전화번호',
    example: '01012345678 --- 학부모 전화번호',
    type: String,
  })
  phone: string;

  @ApiProperty({
    description: '학부모 플랫폼',
    example: 'web --- 학부모가 최근에 사용한 플랫폼',
    type: String,
  })
  platform: string;

  @ApiProperty({
    description: '학부모 pushToken',
    example: '1234567890 --- 학부모 pushToken',
    type: String,
  })
  pushToken: string;
  @ApiProperty({
    description: '학부모 비고',
    example: '블라블라 --- 학부모 비고',
    type: String,
  })
  note: string;

  @ApiProperty({
    description: '학부모 약관동의 시간',
    example: '2025-05-08T02:27:20.321Z --- 학부모 약관동의 시간',
    type: Date,
  })
  termsAgreedAt: Date;

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
