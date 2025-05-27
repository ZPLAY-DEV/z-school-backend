import { ApiProperty } from '@nestjs/swagger';

export class StudentResponseDto {
  @ApiProperty({
    description: '학생 ID',
    example: '103 --- 학생 id',
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: '학부모 ID',
    example: '8 --- 학부모 id',
    type: Number,
  })
  parentId: number;

  @ApiProperty({
    description: '학교 ID',
    example: '1 --- 학교 id',
    type: Number,
  })
  schoolId: number;

  @ApiProperty({
    description: '학년',
    example: '3학년 --- 학생의 학년 정보',
    type: String,
  })
  grade: string;

  @ApiProperty({
    description: '반',
    example: '2반 --- 학생의 반 정보',
    type: String,
  })
  class: string;

  @ApiProperty({
    description: '학번/번호',
    example: '4 --- 학생의 학번/번호',
    type: String,
  })
  studentCode: string;

  @ApiProperty({
    description: '이름',
    example: '홍길동 --- 학생의 이름',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: '전화번호',
    example: '01012345678 --- 학생의 전화번호',
    type: String,
  })
  phone: string | null;

  @ApiProperty({
    description: '보호자 전화번호',
    example: '01012345678 --- 학생의 보호자 전화번호',
    type: String,
  })
  escortPhone: string | null;

  @ApiProperty({
    description: '하교방법',
    example: '도보 --- 학생의 하교방법',
    type: String,
  })
  homeTransit: string | null;

  @ApiProperty({
    description: '하교후 목적지',
    example: '집 --- 학생의 하교후 목적지',
    type: String,
  })
  nextStop: string | null;

  @ApiProperty({
    description: '재학 상태',
    example: 'ATTENDING --- 학생의 재학 상태',
    type: String,
  })
  status: string;

  @ApiProperty({
    description: '비고',
    example: '주의가 필요한 학생 --- 학생의 비고',
    type: String,
  })
  note: string | null;

  @ApiProperty({
    description: '생성 시간',
    example: '2025-05-07T08:53:51.701Z',
    type: String,
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정 시간',
    example: '2025-05-07T08:53:51.701Z',
    type: String,
  })
  updatedAt: Date;
}
