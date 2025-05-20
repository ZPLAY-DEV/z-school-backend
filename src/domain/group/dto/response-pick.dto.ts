import { ApiProperty } from '@nestjs/swagger';
import { EnrollmentRule } from 'src/common/enums';

export class ResponsePickDto {
  @ApiProperty({
    description: '수강신청 규칙',
    enum: EnrollmentRule,
    example: EnrollmentRule.FIRST,
  })
  enrollmentRule: EnrollmentRule;

  @ApiProperty({ description: '정원수', example: 20 })
  offeringCapacity: number;

  @ApiProperty({ description: '수강확정 인원수', example: 18 })
  studentsEnrolled: number;

  @ApiProperty({ description: '빈자리수', example: 2 })
  availableSlots: number;

  constructor(partial: Partial<ResponsePickDto>) {
    Object.assign(this, partial);
  }
}
