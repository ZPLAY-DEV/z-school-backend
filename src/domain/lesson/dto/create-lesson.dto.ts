import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested
} from 'class-validator';
import { ClassStatus, DocumentType } from 'src/common/enums';
import { CreateGroupWithInstructorDto } from 'src/domain/group/dto/create-group.dto';
import { FeeItemDto } from 'src/domain/lesson/dto/fee-item.dto';

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
  })
  @IsOptional()
  @IsString()
  @MaxLength(24) // '홍익대학교 사범대학 부속 초등학교'
  schoolName?: string | null;

  @ApiProperty({ description: '🈵 같은 학기중 과목명은 유니크' })
  @IsString()
  @MaxLength(16)
  lessonName: string;

  @ApiProperty({ description: '🈳 과목설명', required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string | null;

  // todo) need to address this!
  @ApiProperty({ description: '🈳 수업수/term', required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  termlyLessonCount?: number;

  // todo) need to address this!
  @ApiProperty({ description: '🈳 수업수/week', required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  weeklyLessonCount?: number;

  @ApiProperty({ description: '🈵 ISO 형식의 날짜 문자열 (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  start?: string;

  @ApiProperty({ description: '🈵 ISO 형식의 날짜 문자열 (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  end?: string;

  @ApiProperty({
    description: '🈳 수업료 합계 (A -D)',
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @IsInt()
  @IsPositive()
  total?: number;

  @ApiProperty({ description: '🈳 A. 1회 수강료', required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @IsInt()
  @IsPositive()
  instructorFee?: number;

  @ApiProperty({
    description: '🈳 B. 도서구매비 배열 (낮은가격순 정렬)',
    required: false,
  })
  @IsOptional()
  @IsArray()
  bookFees?: FeeItemDto[] | null;

  @ApiProperty({
    description: '🈳 C. 재료구매비 배열 (낮은가격순 정렬)',
    required: false,
  })
  @IsOptional()
  @IsArray()
  materialFees?: FeeItemDto[] | null;

  @ApiProperty({
    description: '🈳 D. 수용비; 매수업별 학교시설 이용경비',
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
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

  @ApiProperty({ description: '🈳 필요한 문서의 Key 값들', required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(DocumentType, { each: true })
  requiredDocuments?: DocumentType[] | null;

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

  @ApiProperty({ description: '🈵 강사 정보 목록' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGroupWithInstructorDto)
  groups: CreateGroupWithInstructorDto[];

  // @ApiProperty({ description: '🈵 분류' })
  // @Column({
  //   type: 'enum',
  //   enum: CategoryEnum,
  //   default: CategoryEnum.FREE_CUSTOM,
  // })
  // @IsEnum(CategoryEnum)
  // category: CategoryEnum;
}

// Controller에서 사용할 타입 (Param 제외)
export type CreateLessonRequestDto = Omit<
  CreateLessonDto,
  'schoolId' | 'termId'
>;
