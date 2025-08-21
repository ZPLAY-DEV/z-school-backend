import { ApiProperty } from '@nestjs/swagger';
import { AttendanceStatus } from 'src/common/enums';
import { Departure } from 'src/domain/departure/entities/departure.entity';
import { Group } from 'src/domain/group/entities/group.entity';

export class SchooldayWithAttendanceDto {
  @ApiProperty({ description: 'Schoolday ID' })
  id: number;

  @ApiProperty({ description: '수업 시작 시간' })
  startsAt: Date;

  @ApiProperty({ description: '수업 종료 시간' })
  endsAt: Date;

  @ApiProperty({ description: '오늘 날짜 (실제 수업일)' })
  today: string;

  @ApiProperty({ description: '원래 예정된 날짜' })
  original: string | null;

  @ApiProperty({ description: '그룹 ID' })
  groupId: number;

  @ApiProperty({ description: '학교 ID' })
  schoolId: number;

  @ApiProperty({ description: '학기 ID' })
  termId: number;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;

  @ApiProperty({ description: '수정일' })
  updatedAt: Date;

  @ApiProperty({ description: '그룹 정보', type: () => Group })
  group: Group;

  @ApiProperty({ description: '하교 정보', type: () => [Departure] })
  departures: Departure[];

  @ApiProperty({
    description: '출석 상태',
    enum: AttendanceStatus,
    example: AttendanceStatus.PRESENT,
  })
  status: AttendanceStatus;

  @ApiProperty({
    description: '학부모 메모',
    nullable: true,
    example: '조퇴 예정입니다',
  })
  parentNote: string | null;
}
