import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { AttendanceStatus } from 'src/common/enums';

export class CreatePresenceDto {
  @ApiProperty({
    description: 'GroupId - 1부터 시작하는 수업 주차 숫자',
    example: 3,
    minimum: 1,
  })
  groupId: number;

  @ApiProperty({
    description: 'StudentId - 1부터 시작하는 수업 주차 숫자',
    example: 3,
    minimum: 1,
  })
  studentId?: number;

  @ApiProperty({
    description: 'week - 1부터 시작하는 수업 주차 숫자',
    example: 3,
    minimum: 1,
  })
  @IsNotEmpty({ message: '주차는 필수입니다' })
  @IsInt({ message: '주차는 정수여야 합니다' })
  @IsPositive({ message: '주차는 1 이상이어야 합니다' })
  week: number;

  @ApiPropertyOptional({
    description: '수업 일자 - YYYY-MM-DD 형식',
    example: '2025-09-01',
  })
  @IsOptional()
  @IsDateString({}, { message: '수업 일자는 YYYY-MM-DD 형식이어야 합니다' })
  lessonDate?: string | null;

  @ApiProperty({
    description: '출석 상태',
    enum: AttendanceStatus,
    enumName: 'AttendanceStatus',
    example: AttendanceStatus.PRESENT,
  })
  @IsEnum(AttendanceStatus, {
    message: '출석 상태는 AttendanceStatus enum 값이어야 합니다',
  })
  status: AttendanceStatus;

  @ApiPropertyOptional({
    description: '출석 메모',
    example: '10분 지각',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: '메모는 문자열이어야 합니다' })
  @MaxLength(255, { message: '메모는 255자를 초과할 수 없습니다' })
  note?: string | null;
}
