import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateDynamoRecordWithRangeDto {
  @ApiPropertyOptional({ description: 'DB의 학교ID' })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  schoolId?: number;

  @ApiPropertyOptional({ description: 'DB의 학기ID' })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  termId?: number;

  @ApiProperty({ description: 'ISO 형식의 날짜 문자열 (YYYY-MM-DD)' })
  @IsString()
  from: string; // "2025-08-14" 형식으로 저장

  @ApiProperty({ description: 'ISO 형식의 날짜 문자열 (YYYY-MM-DD)' })
  @IsString()
  to: string; // "2025-08-14" 형식으로 저장
}

export class CreateDynamoRecordWithDateDto {
  @ApiPropertyOptional({ description: 'DB의 학교ID' })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  schoolId?: number;

  @ApiPropertyOptional({ description: 'DB의 학기ID' })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  termId?: number;

  @ApiProperty({ description: 'ISO 형식의 날짜 문자열 (YYYY-MM-DD)' })
  @IsString()
  date: string; // "2025-08-14" 형식으로 저장
}

export class CreateAttendanceResultDto {
  @ApiProperty({
    description: '생성된 총 출석 기록 수',
    example: 150,
  })
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
