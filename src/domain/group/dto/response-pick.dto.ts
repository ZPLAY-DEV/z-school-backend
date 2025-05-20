import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus, EnrollmentRule } from 'src/common/enums';

export class ResponsePickDto {
  @ApiProperty({ description: '수강신청 규칙', enum: BookingStatus })
  enrollmentRule: EnrollmentRule;

  @ApiProperty({ description: '정원수' })
  offeringCapacity: number;

  @ApiProperty({ description: '수강확정 인원수' })
  studentsEnrolled: number;

  @ApiProperty({ description: '빈자리수' })
  availableSlots: number;

  constructor(partial: Partial<ResponsePickDto>) {
    Object.assign(this, partial);
  }
}
