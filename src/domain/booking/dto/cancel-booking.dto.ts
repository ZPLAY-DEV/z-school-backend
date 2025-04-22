import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class CancelBookingDto {
  @ApiProperty({ description: 'ID of the offering' })
  @IsInt()
  offeringId: number;

  @ApiProperty({ description: 'ID of the student' })
  @IsInt()
  studentId: number;

  constructor(partial: Partial<CancelBookingDto>) {
    Object.assign(this, partial);
  }
}
