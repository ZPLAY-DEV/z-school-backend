import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ClassStatus } from 'src/common/enums';
import { CreateGroupWithInstructorDto } from 'src/domain/group/dto/create-group.dto';

export class FeeItemDto {
  @ApiProperty({ description: '항목명' })
  @IsString()
  @MaxLength(16)
  name: string;

  @ApiProperty({ description: '금액' })
  @IsInt()
  @IsPositive()
  amount: number;
}

export class CreateLessonDto {
  @ApiProperty({ description: '🈵 Term ID', required: true, example: 1 })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  termId: number;

  @ApiProperty({ description: '🈵 분류 ID', required: true, example: 1 })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  categoryId: number;

  @ApiProperty({ description: '🈵 School ID', required: true, example: 1 })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  schoolId: number;

  @ApiProperty({
    description: '🈳 관리자 편의를 위한 학교명',
    required: false,
    nullable: true,
    example: '홍익대학교 사범대학 부속 초등학교',
  })
  @IsOptional()
  @IsString()
  @MaxLength(24) // '홍익대학교 사범대학 부속 초등학교'
  schoolName?: string | null;

  @ApiProperty({
    description: '🈵 같은 학기중 과목명은 유니크',
    example: '초등 영어 A (1~2)',
  })
  @IsString()
  @MaxLength(16)
  lessonName: string;

  @ApiProperty({
    description: '🈳 과목설명',
    required: false,
    nullable: true,
    example: '마이클잭슨 선생님반',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string | null;

  @ApiProperty({
    description: '🈵 ISO 형식의 날짜 문자열 (YYYY-MM-DD)',
    example: '2025-02-01',
  })
  @IsOptional()
  @IsString()
  start?: string;

  @ApiProperty({
    description: '🈵 ISO 형식의 날짜 문자열 (YYYY-MM-DD)',
    example: '2025-05-25',
  })
  @IsOptional()
  @IsString()
  end?: string;

  @ApiProperty({
    description: '🈳 frequency',
    default: 1,
  })
  @IsInt()
  @IsPositive()
  frequency?: number;

  @ApiProperty({
    description: '🈳 수업료 합계 (A - D)',
    required: false,
    default: 0,
  })
  @IsInt()
  @IsPositive()
  total?: number;

  @ApiProperty({ description: '🈳 A. 1회 수강료', required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  instructorFee?: number;

  @ApiProperty({
    description: '🈳 B. 도서구매비 배열 (낮은가격순 정렬)',
    required: false,
    example: [{ name: 'total', amount: 10000 }],
  })
  @IsOptional()
  @IsArray()
  bookFees?: FeeItemDto[] | null;

  @ApiProperty({
    description: '🈳 C. 재료구매비 배열 (낮은가격순 정렬)',
    required: false,
    example: [{ name: 'total', amount: 10000 }],
  })
  @IsOptional()
  @IsArray()
  materialFees?: FeeItemDto[] | null;

  @ApiProperty({
    description: '🈳 D. 수용비; 매수업별 학교시설 이용경비',
    default: 0,
  })
  @IsInt()
  @IsPositive()
  operationFee?: number;

  @ApiProperty({
    description: '🈳 CO 변경없이 동일비용 적용, MC/MF 비율로 계산 (redundant)',
    required: false,
    default: 'CO-1000',
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  operationFeeRule?: string | null;

  @ApiProperty({ description: '🈳 비고', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string | null;

  @ApiProperty({
    description: '🈳 상태',
    enum: ClassStatus,
    default: ClassStatus.PENDING,
  })
  @IsEnum(ClassStatus)
  @IsOptional()
  status?: ClassStatus;

  @ApiProperty({
    description: '🈵 강사 정보 목록',
    example: [
      {
        instructorName: '마이클',
        instructorPhone: '01012340001',
        groupName: '플레이스테이션 C반',
        location: '컴퓨터실A',
        capacity: 20,
        allowedGrades: '1~2',
        weekday: '월',
        start: '12:40',
        end: '13:00',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGroupWithInstructorDto)
  groups: CreateGroupWithInstructorDto[];
}

// Controller에서 사용할 타입 (Param 제외)
export type CreateLessonRequestDto = Omit<
  CreateLessonDto,
  'schoolId' | 'termId'
>;
