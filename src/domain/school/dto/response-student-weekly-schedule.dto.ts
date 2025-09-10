import { ApiProperty } from '@nestjs/swagger';
import { Actor, Weekday } from 'src/common/enums';

export class ResponseGroupSlimDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1, nullable: true })
  termId: number | null;

  @ApiProperty({ example: 1, nullable: true })
  samId: number | null;

  @ApiProperty({ example: 1 })
  lessonId: number;

  @ApiProperty({ example: 1, nullable: true })
  offeringId: number | null;

  @ApiProperty({ example: '수학A반' })
  groupName: string;

  @ApiProperty({ example: '김선생', nullable: true })
  samName: string | null;

  @ApiProperty({ example: '1-1교실', nullable: true })
  location: string | null;

  @ApiProperty({ example: 20 })
  capacity: number;

  @ApiProperty({ example: '1,2,3' })
  allowedGrades: string;

  @ApiProperty({ enum: Weekday, example: Weekday.MONDAY })
  weekday: Weekday;

  @ApiProperty({ example: '14:40' })
  start: string;

  @ApiProperty({ example: '15:20' })
  end: string;

  @ApiProperty({ example: 'CONFIRMED' })
  status: string;

  @ApiProperty({ example: 100000 })
  tuition: number;

  @ApiProperty({ example: 5000 })
  bookFee: number;

  @ApiProperty({ example: 3000 })
  materialFee: number;

  @ApiProperty({ example: 18 })
  days: number;

  @ApiProperty({ enum: Actor, nullable: true })
  deletedBy: Actor | null;

  @ApiProperty({ example: '비고', nullable: true })
  note: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}

export class ResponseSchooldayItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  schoolId: number;

  @ApiProperty({ example: 1 })
  termId: number;

  @ApiProperty({ example: 1 })
  lessonId: number;

  @ApiProperty({ example: 1 })
  groupId: number;

  @ApiProperty({ example: '수학' })
  name: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  startsAt: string;

  @ApiProperty({ type: String, format: 'date-time' })
  endsAt: string;

  @ApiProperty({ example: 40 })
  duration: number;

  @ApiProperty({ enum: Actor, nullable: true })
  updatedBy: Actor | null;

  @ApiProperty({ example: '보강', nullable: true })
  note: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  startNotifiedAt: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  endNotifiedAt: string | null;

  @ApiProperty({ type: () => ResponseGroupSlimDto })
  group: ResponseGroupSlimDto;
}

export class ResponseStudentWeeklyScheduleDto {
  @ApiProperty({ type: [ResponseSchooldayItemDto] })
  SUN: ResponseSchooldayItemDto[];

  @ApiProperty({ type: [ResponseSchooldayItemDto] })
  MON: ResponseSchooldayItemDto[];

  @ApiProperty({ type: [ResponseSchooldayItemDto] })
  TUE: ResponseSchooldayItemDto[];

  @ApiProperty({ type: [ResponseSchooldayItemDto] })
  WED: ResponseSchooldayItemDto[];

  @ApiProperty({ type: [ResponseSchooldayItemDto] })
  THU: ResponseSchooldayItemDto[];

  @ApiProperty({ type: [ResponseSchooldayItemDto] })
  FRI: ResponseSchooldayItemDto[];

  @ApiProperty({ type: [ResponseSchooldayItemDto] })
  SAT: ResponseSchooldayItemDto[];
}
