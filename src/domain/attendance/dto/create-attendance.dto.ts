import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { AttendanceStatus } from 'src/common/enums/attendance-status';

export class CreateAttendanceDto {
  @ApiProperty({ description: '🈵 groupKey (partition key, e.g. "GROUP#1")' })
  @IsString()
  groupKey: string;

  @ApiProperty({
    description:
      '🈵 dailyStudentKey (sort key, e.g. "DATE#2025-05-01#STUDENT#1학년1반-10")',
  })
  @IsString()
  dailyStudentKey: string;

  @ApiProperty({ description: '🈵 lessonId' })
  @IsNumber()
  lessonId: number;

  @ApiProperty({ description: '🈵 lessonName' })
  @IsString()
  lessonName: string;

  @ApiProperty({ description: '🈵 groupId' })
  @IsNumber()
  groupId: number;

  @ApiProperty({ description: '🈵 groupName' })
  @IsString()
  groupName: string;

  @ApiProperty({ description: '🈵 studentId (e.g. "1학년1반-10")' })
  @IsString()
  studentId: string;

  @ApiProperty({ description: '🈵 studentName' })
  @IsString()
  studentName: string;

  @ApiProperty({ description: '🈵 start (e.g. "14:00")' })
  @IsString()
  start: string;

  @ApiProperty({ description: '🈵 end (e.g. "14:40")' })
  @IsString()
  end: string;

  @ApiProperty({ description: '🈵 duration (minutes)' })
  @IsNumber()
  duration: number;

  @ApiProperty({
    description: '🈵 status',
    default: AttendanceStatus.PRESENT,
    required: true,
    enum: AttendanceStatus,
  })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiProperty({
    description: '🈳 학생·학부모가 학교에 남긴 메시지',
    required: false,
  })
  @IsString()
  @IsOptional()
  parentNote?: string;

  @ApiProperty({
    description: '🈳 학교에서 학생·학부모에 남긴 메시지',
    required: false,
  })
  @IsString()
  @IsOptional()
  schoolNote?: string;

  @ApiProperty({ description: '🈳 읽음 여부', required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;

  @ApiProperty({
    description: '🈳 ttl',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  expires?: number;
}
