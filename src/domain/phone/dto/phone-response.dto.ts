import { ApiProperty } from '@nestjs/swagger';

export class PhoneResponseDto {
  @ApiProperty({ description: '🈵 DB의 발신번호 ID', example: 1 })
  id: number;

  @ApiProperty({
    description: '🈵 학교에서 관리하는 발송 번호 (숫자만 입력)',
    example: '01012345678',
  })
  phone: string;

  @ApiProperty({ description: '🈳 발신번호 활성화 상태', example: false })
  isActive: boolean;

  @ApiProperty({
    description: '🈵 createdAt',
    example: '2025-05-02T04:48:35.366Z',
  })
  createdAt: Date;
}
