import { ApiProperty } from '@nestjs/swagger';
import { ClassStatus, Weekday } from 'src/common/enums';

export class GroupResponseDto {
  @ApiProperty({ description: 'id', example: 1, type: Number })
  id: number;

  @ApiProperty({ description: '강사 ID', example: 1, type: Number })
  instructorId: number;

  @ApiProperty({ description: '강좌 ID', example: 1, type: Number })
  lessonId: number;

  @ApiProperty({ description: '반이름', example: '영어수업A', type: String })
  groupName: string | null;

  @ApiProperty({ description: '위치', example: '101호', type: String })
  location: string | null;

  @ApiProperty({ description: '반 정원', example: 20, type: Number })
  capacity: number;

  @ApiProperty({ description: '허용 학년', example: '1,2,3', type: String })
  allowedGrades: string;

  @ApiProperty({
    description: '수업 요일',
    enum: Weekday,
    example: Weekday.MONDAY,
  })
  weekday: Weekday;

  @ApiProperty({
    description: '수업 시작 시간 (HH:mm)',
    example: '14:40',
    type: String,
  })
  start: string;

  @ApiProperty({
    description: '수업 종료 시간 (HH:mm)',
    example: '15:20',
    type: String,
  })
  end: string;

  @ApiProperty({
    description: '상태',
    enum: ClassStatus,
    example: ClassStatus.PENDING,
  })
  status: ClassStatus;

  @ApiProperty({ description: '비고', example: '영어수업A', type: String })
  note: string | null;

  @ApiProperty({ description: '생성일', example: new Date(), type: Date })
  createdAt: Date;

  @ApiProperty({ description: '수정일', example: new Date(), type: Date })
  updatedAt: Date;
}
