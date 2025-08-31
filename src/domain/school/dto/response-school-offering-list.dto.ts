import { ApiProperty } from '@nestjs/swagger';
import { ClassStatus, PickRule, Weekday } from 'src/common/enums';
import { ITimeRange } from 'src/common/interfaces';
import { Booking } from 'src/domain/booking/entities/booking.entity';

export class ResponseSchoolOfferingListDto {
  @ApiProperty({ description: 'offeringId', example: 1 })
  id: number;

  @ApiProperty({ description: '🈵 학교ID' })
  schoolId: number | null;

  @ApiProperty({ description: '🈵 학기ID' })
  termId: number;

  @ApiProperty({ description: '🈵 과목ID' })
  lessonId: number | null;

  @ApiProperty({ description: '과목이름' })
  lessonName: string;

  @ApiProperty({ description: '반이름' })
  groupName: string;

  @ApiProperty({ description: '🈵 강사이름', example: '홍길동' })
  samName: string | null;

  @ApiProperty({ description: 'class size' })
  capacity: number;

  @ApiProperty({ description: 'bookings size' })
  bookingCount: number;

  @ApiProperty({ description: '🈳 prepicked size' })
  prepicked: number;

  @ApiProperty({
    description: '수강가능한 학년들 (배열)',
    type: 'array',
    isArray: true,
  })
  allowedGrades: number[];

  @ApiProperty({
    description: '수강신청 규칙 (enum)',
    enum: PickRule,
  })
  pickRule: PickRule;

  @ApiProperty({
    description: '수업 시간 정보 (could be multiple)',
    type: 'array',
    isArray: true,
  })
  times: ITimeRange[];

  @ApiProperty({
    description: 'bitmasks (수업시간 겹치는지 판단하기 위한 자료)',
    type: 'array',
    isArray: true,
  })
  bitmasks: number[];

  @ApiProperty({
    description: '지난 학기에 수강한 학생 Ids',
    type: 'array',
    isArray: true,
  })
  prepickedStudentIds: number[];

  @ApiProperty({ description: '🈵 상태' })
  status: ClassStatus;

  // list() 메서드에서 추가되는 커스텀 필드들
  @ApiProperty({
    description: '각 반별 총 비용 (수강료 + 교재비 + 재료비)',
    type: 'array',
    isArray: true,
    example: [50000, 45000],
  })
  totals: number[];

  @ApiProperty({ description: '해당 학생의 예약 정보', type: () => Booking })
  booking: Booking | null;

  @ApiProperty({
    description: '수강신청 상태',
    type: 'boolean',
    example: true,
  })
  selectable: boolean;

  @ApiProperty({
    description: '수업 요일 (weekday=true일 때만 포함)',
    enum: Weekday,
    required: false,
  })
  weekday?: Weekday;
}
