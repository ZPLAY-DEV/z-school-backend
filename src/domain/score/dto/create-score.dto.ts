import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IScores } from 'src/common/interfaces';

export class CreateScoreDto {
  @ApiProperty({
    description: '주차 - 1부터 시작하는 수업 주차',
    example: 4,
    minimum: 1,
  })
  @IsNotEmpty({ message: '주차는 필수입니다' })
  @IsInt({ message: '주차는 정수여야 합니다' })
  @IsPositive({ message: '주차는 1 이상이어야 합니다' })
  weekIndex: number;

  @ApiPropertyOptional({
    description: '수업 일자 - YYYY-MM-DD 형식',
    example: '2025-09-01',
  })
  @IsOptional()
  @IsDateString({}, { message: '수업 일자는 YYYY-MM-DD 형식이어야 합니다' })
  lessonDate?: string | null;

  @ApiProperty({
    description: '수업 제목 또는 주제',
    example: '분수의 덧셈 복습',
    maxLength: 120,
  })
  @IsNotEmpty({ message: '수업 제목은 필수입니다' })
  @IsString({ message: '수업 제목은 문자열이어야 합니다' })
  @MaxLength(120, { message: '수업 제목은 120자를 초과할 수 없습니다' })
  title: string;

  @ApiPropertyOptional({
    description: '수업 내용 요약',
    example: '교과서 5단원 2차시 진행, 개념 점검 퀴즈 포함',
  })
  @IsOptional()
  @IsString({ message: '수업 내용은 문자열이어야 합니다' })
  description?: string | null;

  @ApiPropertyOptional({
    description: '평가 점수 묶음',
    example: {
      game: {
        record1: 92,
        record2: 92,
        record3: 92,
      },
      result: {
        record1: 92,
        record2: 92,
        record3: 92,
      },
      measurement: {
        height: 170,
        weight: 70,
        bmi: 24.2,
      },
    },
  })
  @IsOptional()
  value?: IScores | null;
}

