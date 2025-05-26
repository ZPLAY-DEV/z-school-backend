import { ApiProperty } from '@nestjs/swagger';
import { Actor } from 'src/common/enums';

export class PickResponseDto {
  @ApiProperty({ description: 'id', example: 1, type: Number })
  id: number;

  @ApiProperty({ description: 'studentId', example: 1, type: Number })
  studentId: number;

  @ApiProperty({ description: 'groupId', example: 1, type: Number })
  groupId: number;

  @ApiProperty({ description: 'offeringId', example: 1, type: Number })
  offeringId: number;

  @ApiProperty({ description: '교재비', example: 0, type: Number })
  bookFee: number;

  @ApiProperty({ description: '재료비', example: 0, type: Number })
  materialFee: number;

  @ApiProperty({
    description: '수업시작일 등록 주체  ',
    example: Actor.INSTRUCTOR,
    enum: Actor,
  })
  startedBy: Actor | null;

  @ApiProperty({
    description: '수업시작일(첫수업일)',
    example: '2025-01-01',
    type: String,
  })
  startedOn: string | null;

  @ApiProperty({
    description: '수업 종료일 등록 주체 ',
    example: Actor.SYSTEM,
    enum: Actor,
  })
  endedBy: Actor | null;

  @ApiProperty({
    description: '수업종료일(마지막수업일)',
    example: '2025-01-01',
    type: String,
  })
  endedOn: string | null;

  @ApiProperty({ description: '비고', example: null, type: String })
  note: string | null;

  @ApiProperty({ description: 'createdAt', example: null, type: String })
  createdAt: string;

  @ApiProperty({ description: 'updatedAt', example: null, type: String })
  updatedAt: string;
}
