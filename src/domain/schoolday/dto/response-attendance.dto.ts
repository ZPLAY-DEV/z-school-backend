import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsDateString,
    IsInt,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
} from 'class-validator';
import { Pick } from 'src/domain/pick/entities/pick.entity';

export class CreateDynamoRecordWithDateDto {
  @ApiPropertyOptional({ description: '학교ID', example: 1 })
  @IsInt()
  schoolId: number;

  @ApiPropertyOptional({ description: '학기ID', example: 1 })
  @IsInt()
  termId: number;

  @ApiProperty({ description: 'ISO 형식의 날짜 문자열 (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date?: string; // "2025-08-14" 형식으로 저장
}

export class CreateDynamoRecordWithRangeDto {
  @ApiPropertyOptional({ description: '학교ID', example: 1 })
  @IsInt()
  schoolId: number;

  @ApiPropertyOptional({ description: '학기ID', example: 1 })
  @IsInt()
  termId: number;

  @ApiProperty({ description: 'ISO 형식의 날짜 문자열 (YYYY-MM-DD)' })
  @IsString()
  @IsDateString()
  from: string; // "2025-08-14" 형식으로 저장

  @ApiProperty({ description: 'ISO 형식의 날짜 문자열 (YYYY-MM-DD)' })
  @IsString()
  @IsDateString()
  to: string; // "2025-08-14" 형식으로 저장
}

export class ResponseAttendanceDto {
  @ApiProperty({ description: '생성된 총 출석 기록 수', example: 150 })
  total: number;

  @ApiProperty({
    description: '실패한 배치 작업 수',
    example: 0,
  })
  failedBatches: number;

  @ApiProperty({
    description: '이미 존재하는 출석 기록 수',
    example: 0,
  })
  alreadyExists?: number;
}

export class BuildAttendanceBodyDto {
  @ApiProperty({
    description: 'pick',
    example: '{ studentId: 1, groupId: 1, ... }',
  })
  @IsObject()
  pick: Pick;

  @ApiProperty({ description: 'localDate', example: '2025-08-14' })
  @IsString()
  localDate: string;

  @ApiProperty({ description: 'lessonId', example: 40 })
  @IsNumber()
  lessonId: number;

  @ApiProperty({ description: 'lessonName', example: '수학' })
  @IsString()
  lessonName: string;

  @ApiProperty({ description: 'groupId', example: 40 })
  @IsNumber()
  groupId: number;

  @ApiProperty({ description: 'groupName', example: '수학 A반' })
  @IsString()
  groupName: string;

  @ApiProperty({ description: 'start', example: '11:00' })
  @IsString()
  start: string;

  @ApiProperty({ description: 'end', example: '11:40' })
  @IsString()
  end: string;

  @ApiProperty({ description: 'duration', example: 40 })
  @IsNumber()
  duration: number;

  @ApiProperty({ description: 'expires', example: 1718438400 })
  @IsNumber()
  expires: number;
}

export class CreateAttendanceForAllValidTermsDto {
  @ApiProperty({ description: 'ISO 형식의 날짜 문자열 (YYYY-MM-DD)' })
  @IsString()
  @IsDateString()
  date: string;
}

export class DeleteAttendanceBySchoolTermDto {
  @ApiProperty({ description: '학교ID', example: 1 })
  @IsInt()
  schoolId: number;

  @ApiProperty({ description: '학기ID', example: 1 })
  @IsInt()
  termId: number;
}
