import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { CreateAttendanceDto } from 'src/domain/attendance/dto/create-attendance.dto';

// groupKey와 dailyStudentKey를 제외한 나머지 필드들을 optional로 만듦
class BaseUpdateAttendanceDto extends PartialType(
  OmitType(CreateAttendanceDto, ['groupKey', 'dailyStudentKey'] as const),
) {}

export class UpdateAttendanceDto extends BaseUpdateAttendanceDto {
  @ApiProperty({ description: '🈵 groupKey (partition key, e.g. "GROUP#1")' })
  @IsString()
  groupKey: string;

  @ApiProperty({
    description:
      '🈵 dailyStudentKey (sort key, e.g. "DATE#2025-05-01#STUDENT#1학년1반-10")',
  })
  @IsString()
  dailyStudentKey: string;
}

export class AttendanceKeyDto {
  @ApiProperty({ description: '🈵 groupKey (partition key, e.g. "GROUP#1")' })
  @IsString()
  groupKey: string;

  @ApiProperty({
    description:
      '🈵 dailyStudentKey (sort key, e.g. "DATE#2025-05-01#STUDENT#1학년1반-10")',
  })
  @IsString()
  dailyStudentKey: string;
}
