import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateDepartureDto {
  @ApiProperty({ description: '학생 아이디', example: 1 })
  @IsNumber()
  studentId: number;

  @ApiProperty({ description: '실제 마지막 참석 수업 아이디', example: 1 })
  @IsNumber()
  schooldayId: number;

  @ApiProperty({
    description: '하교 날짜',
    example: '2025-07-07',
  })
  @IsString()
  date: string;

  @ApiProperty({
    description: '하교시 메모',
    example: '정상 하교',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    description: '하교시간',
    example: '2025-01-15T15:30:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  departuredAt?: string;
}
