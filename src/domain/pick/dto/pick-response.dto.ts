import { ApiProperty } from '@nestjs/swagger';
import { Actor } from 'src/common/enums';

export class PickResponseDto {
  @ApiProperty({
    description: 'id',
    example: '1 --- 학생의 수강 확정한 기록을 저장하는 pick entity의 id',
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'studentId',
    example: '102 --- 학생의 id',
    type: Number,
  })
  studentId: number;

  @ApiProperty({
    description: 'groupId',
    example: '1 --- 학생이 수강 확정한 반의 id',
    type: Number,
  })
  groupId: number;

  @ApiProperty({
    description: 'offeringId',
    example: '1 --- 학생이 수강 신청한 수업의 id ( offering entity의 id )',
    type: Number,
  })
  offeringId: number;

  @ApiProperty({
    description: '교재비',
    example: '12000 --- 학생이 수강 확정한 수업의 교재비',
    type: Number,
  })
  bookFee: number;

  @ApiProperty({
    description: '재료비',
    example: '8200 --- 학생이 수강 확정한 수업의 재료비',
    type: Number,
  })
  materialFee: number;

  @ApiProperty({
    description: '수업시작일 등록 주체  ',
    example:
      'INSTRUCTOR --- 수강 확정 등록 주체 ( SYSTEM, INSTRUCTOR, MANAGER )',
    enum: Actor,
  })
  startedBy: Actor | null;

  @ApiProperty({
    description: '수업시작일(첫수업일)',
    example: '2025-01-01 --- 학생이 수강 확정한 수업의 첫 수업일',
    type: String,
  })
  startedOn: string | null;

  @ApiProperty({
    description: '수업 종료일 등록 주체 ',
    example: 'SYSTEM --- 수강 취소 등록 주체 ( SYSTEM, INSTRUCTOR, MANAGER )',
    enum: Actor,
  })
  endedBy: Actor | null;

  @ApiProperty({
    description: '수업종료일(마지막수업일)',
    example: '2025-01-01 --- 학생이 취소한 날짜 ',
    type: String,
  })
  endedOn: string | null;

  @ApiProperty({
    description: '비고',
    example: 'null --- 학생이 수강 확정한 수업의 비고',
    type: String,
  })
  note: string | null;

  @ApiProperty({ description: 'createdAt', example: null, type: String })
  createdAt: string;

  @ApiProperty({ description: 'updatedAt', example: null, type: String })
  updatedAt: string;
}
