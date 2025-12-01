import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IScores } from 'src/common/interfaces';

export class CreateScoreDto {
  @ApiProperty({
    description: 'GroupId, param 전달시 dto 는 생략하므로 optional 처리',
    example: 3,
    minimum: 1,
  })
  @IsInt({ message: 'groupId는 정수여야 합니다' })
  @IsOptional()
  groupId?: number;

  @ApiProperty({
    description: 'StudentId, param 전달시 dto 는 생략하므로 optional 처리',
    example: 3,
    minimum: 1,
  })
  @IsInt({ message: 'studentId는 정수여야 합니다' })
  @IsOptional()
  studentId?: number;

  @ApiProperty({
    description: 'week - 1부터 시작하는 수업 주차 숫자',
    example: 3,
    minimum: 1,
  })
  @IsInt({ message: '주차는 정수여야 합니다' })
  weekNumber: number;

  @ApiPropertyOptional({
    description: '수업 일자 - YYYY-MM-DD 형식',
    example: '2025-09-01',
  })
  @IsOptional()
  @IsDateString({}, { message: '수업 일자는 YYYY-MM-DD 형식이어야 합니다' })
  lessonDate?: string | null;

  @ApiProperty({
    description: '평가 점수. need to exist',
    example: {
      game: {
        primary: 100,
        secondary: 92,
      },
      result: {
        primary: 92,
        secondary: 92,
      },
      measurement: {
        height: 170,
        weight: 70,
      },
    },
  })
  @IsObject({ message: 'value는 객체여야 합니다' })
  value: IScores;

  @ApiPropertyOptional({
    description: '점수 메모',
    example: '이런 저런',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: '메모는 문자열이어야 합니다' })
  @MaxLength(255, { message: '메모는 255자를 초과할 수 없습니다' })
  note?: string | null;
}
