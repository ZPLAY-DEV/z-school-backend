import { ApiProperty } from '@nestjs/swagger';
import { ClassStatus, Weekday } from 'src/common/enums';

export class GroupResponseDto {
  @ApiProperty({ description: 'id', example: '1 --- 반의 id', type: Number })
  id: number;

  @ApiProperty({
    description: '강사 ID',
    example: '1 --- 반의 강사의 id',
    type: Number,
  })
  samId: number;

  @ApiProperty({
    description: '강좌 ID',
    example: '1 --- 강좌 id',
    type: Number,
  })
  lessonId: number;

  @ApiProperty({
    description: '반이름',
    example: '영어수업A --- 반이름',
    type: String,
  })
  groupName: string | null;

  @ApiProperty({
    description: '위치',
    example: '101호 -- 수업위치 ',
    type: String,
  })
  location: string | null;

  @ApiProperty({
    description: '반 정원',
    example: '20 --- 반의 정원',
    type: Number,
  })
  capacity: number;

  @ApiProperty({
    description: '허용 학년',
    example: '1,2,3 --- 반의 허용 학년 (쉼표로 구분)',
    type: String,
  })
  allowedGrades: string;

  @ApiProperty({
    description: '수업 요일',
    enum: Weekday,
    example: 'MONDAY --- 수업 요일',
  })
  weekday: Weekday;

  @ApiProperty({
    description: '수업 시작 시간 (HH:mm)',
    example: '14:40 --- 수업 시작 시간',
    type: String,
  })
  start: string;

  @ApiProperty({
    description: '수업 종료 시간 (HH:mm)',
    example: '15:20 --- 수업 종료 시간',
    type: String,
  })
  end: string;

  @ApiProperty({
    description: '상태',
    enum: ClassStatus,
    example:
      'PENDING --- 반의 수업 상태 (PENDING: 대기, ACTIVE: 진행중, COMPLETED: 완료)',
  })
  status: ClassStatus;

  @ApiProperty({
    description: '비고',
    example: '영어수업A는 가끔 102호에서 진행 --- 반의 비고란',
    type: String,
  })
  note: string | null;

  @ApiProperty({ description: '생성일', example: new Date(), type: Date })
  createdAt: Date;

  @ApiProperty({ description: '수정일', example: new Date(), type: Date })
  updatedAt: Date;
}
