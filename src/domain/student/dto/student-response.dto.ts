import { ApiProperty } from '@nestjs/swagger';
import { GroupResponseDto } from 'src/domain/group/dto/group-response.dto';
import { ParentResponseDto } from 'src/domain/parent/dto/parent-response.dto';

export class StudentResponseDto {
  @ApiProperty({ description: '학생 ID', example: 103, type: Number })
  id: number;

  @ApiProperty({ description: '학부모 ID', example: 8, type: Number })
  parentId: number;

  @ApiProperty({ description: '학교 ID', example: 1, type: Number })
  schoolId: number;

  @ApiProperty({ description: '학년', example: '3학년', type: String })
  grade: string;

  @ApiProperty({ description: '반', example: '2반', type: String })
  class: string;

  @ApiProperty({ description: '학번/번호', example: '4', type: String })
  studentCode: string;

  @ApiProperty({ description: '이름', example: '홍길동', type: String })
  name: string;

  @ApiProperty({
    description: '전화번호',
    example: '01012345678',
    type: String,
  })
  phone: string | null;

  @ApiProperty({
    description: '보호자 전화번호',
    example: '01012345678',
    type: String,
  })
  escortPhone: string | null;

  @ApiProperty({ description: '하교방법', example: '도보', type: String })
  homeTransit: string | null;

  @ApiProperty({ description: '하교후 목적지', example: '집', type: String })
  nextStop: string | null;

  @ApiProperty({ description: '상태', example: 'ATTENDING', type: String })
  status: string;

  @ApiProperty({ description: '비고', example: '블라블라', type: String })
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

  @ApiProperty({ description: '학부모 정보', type: ParentResponseDto })
  parent: ParentResponseDto;

  @ApiProperty({
    description: '수강중인 강좌 정보',
    type: GroupResponseDto,
    isArray: true,
  })
  groupStudents: GroupResponseDto[];
}
