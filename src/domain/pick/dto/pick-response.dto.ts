import { ApiProperty } from '@nestjs/swagger';
import { Actor } from 'src/common/enums';

export class PickResponseDto {
  @ApiProperty({
    description: 'id',
    example: 1,
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'studentId',
    example: 1,
    type: Number,
  })
  studentId: number;

  @ApiProperty({
    description: '수강확정 group 의 id',
    example: 1,
    type: Number,
  })
  groupId: number;

  @ApiProperty({
    description: '수강신청과목(offering) 의 id',
    example: 1,
    type: Number,
  })
  offeringId: number;

  @ApiProperty({
    description: '학생이 수강하는 반에 한정된 교재비',
    example: 10000,
    type: Number,
  })
  bookFee: number;

  @ApiProperty({
    description: '학생이 수강하는 반에 한정된 재료비',
    example: 8000,
    type: Number,
  })
  materialFee: number;

  @ApiProperty({
    description:
      '전학생 수업시작일 등록 주체 (INSTRUCTOR, MANAGER, OTHER). 정상의 경우 null',
    nullable: true,
    example: Actor.INSTRUCTOR,
    enum: Actor,
  })
  startedBy: Actor | null;

  @ApiProperty({
    description:
      '첫 수업일 (전학생의 경우 첫 수업일이 다른 학생과 다를 수 있다.)',
    example: '2025-01-01',
    type: String,
  })
  startedOn: string | null;

  @ApiProperty({
    description:
      '전학생 수업종료일 등록 주체 (INSTRUCTOR, MANAGER, OTHER). 정상의 경우 null',
    example: Actor.INSTRUCTOR,
    nullable: true,
    enum: Actor,
  })
  endedBy: Actor | null;

  @ApiProperty({
    description:
      '마지막 수업일 (전학생의 경우 마지막 수업일이 다른 학생과 다를 수 있다.)',
    example: '2025-08-01',
    type: String,
  })
  endedOn: string | null;

  @ApiProperty({
    description: '비고',
    example: '특이사항 입력란',
    nullable: true,
    type: String,
  })
  note: string | null;

  @ApiProperty({ description: 'createdAt', example: null, type: String })
  createdAt: string;

  @ApiProperty({ description: 'updatedAt', example: null, type: String })
  updatedAt: string;
}
