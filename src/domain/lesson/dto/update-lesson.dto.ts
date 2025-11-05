import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ClassStatus } from 'src/common/enums';
import { CreateGroupWithInstructorDto } from 'src/domain/group/dto/create-group.dto';
import { FeeItemDto } from './create-lesson.dto';

export class UpdateLessonDto {
  @ApiProperty({
    description: '🚫 학기 ID (수정 불가 - 내부 사용)',
    required: false,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  termId?: number;

  @ApiProperty({
    description: '🚫 학교 ID (수정 불가 - 내부 사용)',
    required: false,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  schoolId?: number;

  @ApiProperty({
    description: '🚫 반 정보 (별도 API 사용 - 내부 사용)',
    required: false,
    type: [CreateGroupWithInstructorDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGroupWithInstructorDto)
  groups?: CreateGroupWithInstructorDto[];

  @ApiProperty({
    description: 'category ID',
    required: false,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  categoryId?: number;

  @ApiProperty({
    description: '🈳 과목명 수정 (동일 학기 내 유니크)',
    required: false,
    example: '초등 영어 A+ (1~2)',
    maxLength: 16,
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  lessonName?: string;

  @ApiProperty({
    description: '🈳 과목 설명 수정',
    required: false,
    nullable: true,
    example: '마이클잭슨 선생님반 - 업데이트',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string | null;

  @ApiProperty({
    description: '🈳 수업 시작일 수정 (YYYY-MM-DD)',
    required: false,
    example: '2025-02-15',
  })
  @IsOptional()
  @IsString()
  start?: string;

  @ApiProperty({
    description: '🈳 수업 종료일 수정 (YYYY-MM-DD)',
    required: false,
    example: '2025-06-30',
  })
  @IsOptional()
  @IsString()
  end?: string;

  @ApiProperty({
    description: '🈳 주당 수업 횟수 수정',
    required: false,
    minimum: 1,
    maximum: 6,
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  frequency?: number;

  @ApiProperty({ description: '🈳 weeks', required: false, example: 12 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  weeks?: number;

  @ApiProperty({
    description: '🈳 전체 수업료 합계 수정 (A - D)',
    required: false,
    minimum: 0,
    example: 150000,
  })
  @IsOptional()
  @IsInt()
  total?: number;

  @ApiProperty({
    description: '🈳 1회 수강료 수정 (강사비)',
    required: false,
    minimum: 0,
    example: 50000,
  })
  @IsOptional()
  @IsInt()
  instructorFee?: number;

  @ApiProperty({
    description: '🈳 도서구매비 배열 수정',
    required: false,
    nullable: true,
    type: [FeeItemDto],
    example: [
      { name: '교재비', amount: 25000 },
      { name: '부교재비', amount: 15000 },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeeItemDto)
  bookFees?: FeeItemDto[] | null;

  @ApiProperty({
    description: '🈳 재료구매비 배열 수정',
    required: false,
    nullable: true,
    type: [FeeItemDto],
    example: [
      { name: '재료비', amount: 30000 },
      { name: '도구비', amount: 20000 },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeeItemDto)
  materialFees?: FeeItemDto[] | null;

  @ApiProperty({
    description: '🈳 수용비 수정 (매 수업별 학교시설 이용비)',
    required: false,
    minimum: 0,
    example: 5000,
  })
  @IsOptional()
  @IsInt()
  operationFee?: number;

  @ApiProperty({
    description: '🈳 수용비 규칙 수정',
    required: false,
    nullable: true,
    example: 'CO-1000',
    maxLength: 16,
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  operationFeeRule?: string | null;

  @ApiProperty({
    description: '🈳 비고 수정',
    required: false,
    nullable: true,
    example: '특별 프로그램 - 업데이트된 내용',
  })
  @IsOptional()
  @IsString()
  note?: string | null;

  @ApiProperty({
    description: '🈳 과목 상태 수정',
    required: false,
    enum: ClassStatus,
    example: ClassStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ClassStatus)
  status?: ClassStatus;
}
