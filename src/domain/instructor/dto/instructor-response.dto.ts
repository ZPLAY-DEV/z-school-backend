import { ApiProperty } from '@nestjs/swagger';

export class InstructorResponseDto {
  @ApiProperty({
    description: 'id',
    example: '1 --- 앱으로 가입한 강사의 id',
    type: Number,
  })
  id: number;
  @ApiProperty({
    description: '강사의 userId',
    example: '1 --- 앱으로 가입한 강사의 userId',
    type: Number,
  })
  userId: number | null;
  @ApiProperty({
    description: '강사 이름',
    example: '홍길동 --- 앱으로 가입한 강사의 이름',
    type: String,
  })
  name: string;
  @ApiProperty({
    description: '강사 전화 번호',
    example: '01012345678 --- 앱으로 가입한 강사의 전화 번호',
    type: String,
  })
  phone: string;
  @ApiProperty({
    description: '강사 점수 ( 0~100  )',
    example: '5 --- 앱으로 가입한 강사의 점수',
    type: Number,
  })
  score: number;
  @ApiProperty({
    description: '등록된 문서 리스트',
    example:
      '[이력서, 경력증명서 ..] --- 앱으로 가입한 강사가 제출한 공통 서류',
    type: String,
  })
  registeredDocuments: DocumentType[] | null;
  @ApiProperty({
    description: '약관동의 시간',
    example:
      '2025-05-08T02:27:20.321Z --- 앱으로 가입한 강사가 약관동의한 시간',
    type: String,
  })
  termsAgreedAt: Date | null;
  @ApiProperty({ description: '생성 시간', example: new Date(), type: Date })
  createdAt: Date;
  @ApiProperty({ description: '수정 시간', example: new Date(), type: Date })
  updatedAt: Date;
}
