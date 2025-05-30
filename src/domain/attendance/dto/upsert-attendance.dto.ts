import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { CreateAttendanceDto } from 'src/domain/attendance/dto/create-attendance.dto';

// 키 필드들은 필수로 유지하고, 나머지는 optional로 만듦
const OptionalFields = PartialType(CreateAttendanceDto);

export class UpsertAttendanceDto extends OptionalFields {
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
