import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { ClassStatus, PickRule } from 'src/common/enums';
import { ITimeRange } from 'src/common/interfaces';
import { Booking } from 'src/domain/booking/entities/booking.entity';

export class ResponseSchoolOfferingListDto {
  @ApiProperty({ description: 'offeringId', example: 1 })
  @Expose()
  id: number;

  @ApiProperty({ description: '🈵 학교ID' })
  @Expose()
  schoolId: number | null;

  @ApiProperty({ description: '🈵 학기ID' })
  @Expose()
  termId: number;

  @ApiProperty({ description: '🈵 과목ID' })
  @Expose()
  lessonId: number | null;

  @ApiProperty({ description: '학교명' })
  @Expose()
  schoolName: string;

  @ApiProperty({ description: '과목이름' })
  @Expose()
  lessonName: string;

  @ApiProperty({ description: '반이름' })
  @Expose()
  groupName: string;

  @ApiProperty({ description: '🈵 강사이름', example: '홍길동' })
  @Expose()
  samName: string | null;

  @ApiProperty({ description: 'class size' })
  @Expose()
  capacity: number;

  @ApiProperty({ description: 'bookings size' })
  @Expose()
  bookingCount: number;

  @ApiProperty({ description: '🈳 prepicked size' })
  @Expose()
  prepicked: number;

  @ApiProperty({
    description: '수강가능한 학년들 (배열)',
    type: 'array',
    isArray: true,
  })
  @Expose()
  allowedGrades: number[];

  @ApiProperty({
    description: '수강신청 규칙 (enum)',
    enum: PickRule,
  })
  @Expose()
  pickRule: PickRule;

  @ApiProperty({
    description: '수업 시간 정보 (could be multiple)',
    type: 'array',
    isArray: true,
  })
  @Expose()
  times: ITimeRange[];

  @ApiProperty({
    description: '지난 학기에 수강한 학생 Ids',
    type: 'array',
    isArray: true,
  })
  @Expose()
  prepickedStudentIds: number[];

  @ApiProperty({ description: '🈵 상태' })
  @Expose()
  status: ClassStatus;

  // list() 메서드에서 추가되는 커스텀 필드들
  @ApiProperty({
    description: '각 반별 총 비용 (수강료 + 교재비 + 재료비)',
    type: 'array',
    isArray: true,
    example: [50000, 45000],
  })
  @Expose()
  totals: number[];

  @ApiProperty({ description: '해당 학생의 예약 정보', type: () => Booking })
  @Expose()
  booking: Booking | null;

  @ApiProperty({
    description: '수강신청 상태',
    type: 'boolean',
    example: true,
  })
  @Expose()
  selectable: boolean;
}
