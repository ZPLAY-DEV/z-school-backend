import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateSchooldayDto {
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

  @ApiPropertyOptional({ description: 'DB의 수업ID' })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  lessonId?: number;

  @ApiPropertyOptional({ description: 'DB의 반ID' })
  @IsInt()
  @Type(() => Number)
  groupId: number;

  @ApiPropertyOptional({ description: '휴일/행사일 이름' })
  @IsString()
  @MaxLength(16)
  name: string;

  @ApiProperty({ description: '시작시각 (DateTime)' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  startsAt?: Date;

  @ApiProperty({ description: '종료시각 (DateTime)' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endsAt?: Date;

  @ApiPropertyOptional({ description: '수업시간 분단위' })
  @IsInt()
  @Type(() => Number)
  duration: number;

  @ApiPropertyOptional({ description: '비고' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string | null;
}
