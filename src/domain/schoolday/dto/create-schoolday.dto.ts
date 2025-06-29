import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Actor } from 'src/common/enums';

export class CreateSchooldayDto {
  @ApiPropertyOptional({ description: 'schoolId', example: 1 })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  schoolId?: number;

  @ApiPropertyOptional({ description: 'termId', example: 1 })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  termId?: number;

  @ApiPropertyOptional({ description: 'lessonId', example: 1 })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  lessonId?: number;

  @ApiPropertyOptional({ description: 'groupId', example: 1 })
  @IsInt()
  @Type(() => Number)
  groupId: number;

  @ApiPropertyOptional({ description: 'name', example: '과목명' })
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

  @ApiProperty({
    description: '수업 종료일 등록 주체 (INSTRUCTOR, MANAGER, OTHER)',
    example: 'MANAGER',
    enum: Actor,
  })
  @IsEnum(Actor)
  @IsOptional()
  updatedBy?: Actor;

  @ApiPropertyOptional({ description: '비고' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string | null;
}
