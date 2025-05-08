import { ApiProperty } from '@nestjs/swagger';

export class CreateStudentResponseDto {
  @ApiProperty({ description: '학생 ID', example: 1, type: Number })
  id: number;
  @ApiProperty({ description: '학부모 ID', example: 1, type: Number })
  parentId: number;
  @ApiProperty({ description: '학교 ID', example: 1, type: Number })
  schoolId: number;
  @ApiProperty({ description: '학년', example: '3학년', type: String })
  grade: string;
  @ApiProperty({ description: '반', example: '1반', type: String })
  class: string;
  @ApiProperty({ description: '학번/번호', example: '4', type: String })
  studentCode: string;
  @ApiProperty({
    description: '전화번호',
    example: '01012345678',
    type: String,
  })
  phone: string;
  @ApiProperty({
    description: '보호자 전화번호',
    example: '01012345678',
    type: String,
  })
  escortPhone: string;
  @ApiProperty({ description: '하교방법', example: '도보', type: String })
  homeTransit: string;
  @ApiProperty({ description: '하교후 목적지', example: '집', type: String })
  nextStop: string;
  @ApiProperty({ description: '상태', example: 'ATTENDING', type: String })
  status: string;
  @ApiProperty({ description: '비고', example: '블라블라', type: String })
  note: string;
  @ApiProperty({
    description: '생성 시간',
    example: '2025-05-08T02:09:17.206Z',
    type: String,
  })
  createdAt: string;
  @ApiProperty({
    description: '수정 시간',
    example: '2025-05-08T02:09:17.206Z',
    type: String,
  })
  updatedAt: string;
}
