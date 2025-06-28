import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { AttendanceStatus } from 'src/common/enums/attendance-status';

export class CreateWithStudentAndSchooldayDto {
  @ApiProperty({
    description: '🈵 학생 ID',
    example: 123,
    type: 'number',
  })
  @IsNumber()
  studentId: number;

  @ApiProperty({
    description: '🈵 수업일 ID',
    example: 456,
    type: 'number',
  })
  @IsNumber()
  schooldayId: number;

  @ApiProperty({
    description: '🈵 출석 상태',
    default: AttendanceStatus.INIT,
    required: false,
    enum: AttendanceStatus,
    example: AttendanceStatus.PRESENT,
  })
  @IsEnum(AttendanceStatus)
  @IsOptional()
  status?: AttendanceStatus;

  @ApiProperty({
    description: '🈳 학부모가 남긴 메시지',
    required: false,
    example: '감기로 인해 결석합니다.',
    type: 'string',
  })
  @IsString()
  @IsOptional()
  parentNote?: string;

  @ApiProperty({
    description: '🈳 강사가 남긴 메시지',
    required: false,
    example: '아라쪄요.',
    type: 'string',
  })
  @IsString()
  @IsOptional()
  schoolNote?: string;
}
