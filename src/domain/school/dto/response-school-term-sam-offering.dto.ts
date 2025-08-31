import { ApiProperty } from '@nestjs/swagger';
import { ClassStatus, PickRule } from 'src/common/enums';
import { ITimeRange } from 'src/common/interfaces';

export class GroupTuitionInfo {
  @ApiProperty({ description: 'group ID', example: 1 })
  groupId: number;

  @ApiProperty({ description: '반이름', example: '체육A반' })
  groupName: string;

  @ApiProperty({ description: '🈵 수업료 합계 (A+B+C+D)', example: 100000 })
  tuition: number;
}

export class ResponseSchoolTermSamOfferingDto {
  @ApiProperty({ description: 'offeringId', example: 1 })
  id: number;

  @ApiProperty({ description: '🈵 학교ID' })
  schoolId: number | null;

  @ApiProperty({ description: '🈵 학기ID' })
  termId: number;

  @ApiProperty({ description: '🈵 과목ID' })
  lessonId: number | null;

  @ApiProperty({ description: '학교명' })
  schoolName: string;

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
    description:
      '수강신청과목에 포함된 반 Ids (예. 체육A 는 월요일반과 수요일반 수업으로 구성)',
    type: 'array',
    isArray: true,
  })
  groupIds: number[];

  @ApiProperty({
    description: '지난 학기에 수강한 학생 Ids',
    type: 'array',
    isArray: true,
  })
  prepickedStudentIds: number[];

  @ApiProperty({
    description:
      '해당 수강신청과목 취소하면, full sync 가 이뤄지는데, 이를 처리하는데 필요한 version 정보를 저장',
    type: 'number',
  })
  lastSyncTimestamp: number;

  @ApiProperty({ description: '🈵 상태' })
  status: ClassStatus;

  @ApiProperty({ description: 'createdAt' })
  createdAt: Date;

  @ApiProperty({ description: 'updatedAt' })
  updatedAt: Date;

  // 추가 필드: 연관된 그룹들의 tuition 정보
  @ApiProperty({
    description: '해당 offering에 속한 각 그룹들의 수업료 정보',
    type: 'array',
    isArray: true,
  })
  totals: number[];
}
