import { ApiProperty } from '@nestjs/swagger';
import { PickRule } from 'src/common/enums';
import { ITimeRange } from 'src/common/interfaces';

export class OfferingResponseDto {
  @ApiProperty({ description: 'ID', type: Number })
  id: number;

  @ApiProperty({ description: '학기 ID', type: Number })
  termId: number;

  @ApiProperty({ description: '학교 ID', type: Number })
  schoolId: number;

  @ApiProperty({ description: '학교 이름', type: String })
  schoolName: string;

  @ApiProperty({ description: '과목 ID', type: Number })
  lessonId: number;

  @ApiProperty({ description: '과목 이름', type: String })
  lessonName: string;

  @ApiProperty({ description: '수용 인원', type: Number })
  capacity: number;

  @ApiProperty({
    description: '수강 가능한 학년 (배열)',
    type: Number,
    isArray: true,
  })
  allowedGrades: number[];

  @ApiProperty({ description: '수강신청 규칙 (enum)', enum: PickRule })
  pickRule: PickRule.FIRST;

  @ApiProperty({
    description: '수업 시간 정보 (could be multiple)',
    type: 'array',
    isArray: true,
  })
  times: ITimeRange[];

  @ApiProperty({
    description: 'bitmasks (수업시간 겹치는지 판단하기 위한 자료)',
    type: Number,
    isArray: true,
  })
  bitmasks: number[];

  @ApiProperty({
    description: '그룹 ID (배열)',
    type: Number,
    isArray: true,
  })
  groupIds: number[];

  @ApiProperty({
    description: '지난 학기에 수강한 학생 ID (배열)',
    type: Number,
    isArray: true,
  })
  formerStudentIds: number[];

  @ApiProperty({
    description: '마지막 동기화 타임스탬프 (배열)',
    type: Number,
    isArray: true,
  })
  lastSyncTimestamp: number[];

  @ApiProperty({ description: '생성 일자', type: Date })
  createdAt: Date;

  @ApiProperty({ description: '수정 일자', type: Date })
  updatedAt: Date;
}
