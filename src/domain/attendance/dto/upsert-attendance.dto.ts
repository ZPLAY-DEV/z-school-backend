import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AttendanceStatus } from 'src/common/enums';
import { UpdateAttendanceDto } from 'src/domain/attendance/dto/update-attendance.dto';

export class UpsertAttendanceDto extends UpdateAttendanceDto {
  @ApiProperty({
    description: '🈵 그룹 키 (파티션 키)',
    example: 'GROUP#123',
    type: 'string',
    pattern: '^GROUP#\\d+$',
  })
  @IsString()
  groupKey: string;

  @ApiProperty({
    description: '🈵 일일 학생 키 (정렬 키) - 날짜, 학생 ID, 학급 정보 포함',
    example: 'DATE#2025-01-15#STUDENT#123#1-A-01',
    type: 'string',
    pattern: '^DATE#\\d{4}-\\d{2}-\\d{2}#STUDENT#\\d+#.*$',
  })
  @IsString()
  dailyStudentKey: string;
}

export class AttendanceKeyDto {
  @ApiProperty({
    description: '🈵 그룹 키 (파티션 키)',
    example: 'GROUP#123',
    type: 'string',
    pattern: '^GROUP#\\d+$',
  })
  @IsString()
  groupKey: string;

  @ApiProperty({
    description: '🈵 일일 학생 키 (정렬 키) - 날짜, 학생 ID, 학급 정보 포함',
    example: 'DATE#2025-01-15#STUDENT#123#1-A-01',
    type: 'string',
    pattern: '^DATE#\\d{4}-\\d{2}-\\d{2}#STUDENT#\\d+#.*$',
  })
  @IsString()
  dailyStudentKey: string;
}

export class AttendanceStatusDto {
  @ApiProperty({
    description: '🈵 그룹 키 (파티션 키)',
    example: 'GROUP#123',
    type: 'string',
    pattern: '^GROUP#\\d+$',
  })
  @IsString()
  groupKey: string;

  @ApiProperty({
    description: '🈵 일일 학생 키 (정렬 키) - 날짜, 학생 ID, 학급 정보 포함',
    example: 'DATE#2025-01-15#STUDENT#123#1-A-01',
    type: 'string',
    pattern: '^DATE#\\d{4}-\\d{2}-\\d{2}#STUDENT#\\d+#.*$',
  })
  @IsString()
  dailyStudentKey: string;

  @ApiProperty({
    description: '🈵 status',
    default: AttendanceStatus.PRESENT,
    required: true,
    enum: AttendanceStatus,
  })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiProperty({
    description: '🈵 학교에서 학생·학부모에 남긴 메시지',
    default: '감사합니다.',
    required: false,
  })
  @IsOptional()
  @IsString()
  schoolNote?: string | null;

  @ApiProperty({
    description: '🈵 학생·학부모가 학교에 남긴 메시지',
    default: '감사합니다.',
    required: false,
  })
  @IsOptional()
  @IsString()
  parentNote?: string;
}
