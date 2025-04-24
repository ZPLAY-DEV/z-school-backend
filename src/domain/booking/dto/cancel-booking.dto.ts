import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';

export class CancelBookingDto {
  @ApiProperty({ description: 'ID of the offering' })
  @IsInt()
  offeringId: number;

  @ApiProperty({ description: '수강신청 과목명' })
  @IsString()
  lessonName: string;

  @ApiProperty({ description: 'ID of the student' })
  @IsInt()
  studentId: number;

  constructor(partial: Partial<CancelBookingDto>) {
    Object.assign(this, partial);
  }
}
