import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { CreateAttendanceDto } from 'src/domain/attendance/dto/create-attendance.dto';

// 키 필드들은 필수로 유지하고, 나머지는 optional로 만듦
const OptionalFields = PartialType(CreateAttendanceDto);

export class UpsertAttendanceDto extends OptionalFields {
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
