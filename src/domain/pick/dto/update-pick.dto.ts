import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Actor } from 'src/common/enums';

/**
 * 확정수강생(Pick) 정보 수정 DTO
 * - 실제로 업데이트 가능한 필드들만 포함
 * - groupId, studentId, offeringId, termId는 수정 불가 (비즈니스 규칙)
 */
export class UpdatePickDto {
  @ApiPropertyOptional({
    description: '반 ID - 해당 반의 고유 식별자',
    example: 1,
  })
  @IsInt({ message: '반 ID는 정수여야 합니다' })
  @IsOptional()
  @IsPositive({ message: '반 ID는 1 이상이어야 합니다' })
  groupId?: number;

  @ApiPropertyOptional({
    description: '학생 ID - 해당 학생의 고유 식별자',
    example: 1,
  })
  @IsInt({ message: '학생 ID는 정수여야 합니다' })
  @IsOptional()
  @IsPositive({ message: '학생 ID는 1 이상이어야 합니다' })
  studentId?: number;

  @ApiPropertyOptional({
    description: '학교 ID - 해당 학교의 고유 식별자',
    example: 1,
  })
  @IsInt({ message: '학교 ID는 정수여야 합니다' })
  @IsOptional()
  @IsPositive({ message: '학교 ID는 1 이상이어야 합니다' })
  schoolId?: number;

  @ApiPropertyOptional({
    description: '학기 ID - 해당 학기의 고유 식별자',
    example: 1,
  })
  @IsInt({ message: '학기 ID는 정수여야 합니다' })
  @IsOptional()
  @IsPositive({ message: '학기 ID는 1 이상이어야 합니다' })
  termId?: number;

  @ApiPropertyOptional({
    description: '학기 ID - 해당 학기의 고유 식별자',
    example: 1,
  })
  @IsInt({ message: '학기 ID는 정수여야 합니다' })
  @IsOptional()
  index?: number;

  @ApiPropertyOptional({
    description:
      '수업시작일 등록자 구분 - MANAGER: 관리자, INSTRUCTOR: 강사, OTHER: 기타',
    enum: Actor,
    enumName: 'Actor',
    example: Actor.MANAGER,
  })
  @IsOptional()
  @IsEnum(Actor, {
    message:
      'startedBy는 유효한 Actor 값이어야 합니다 (MANAGER, INSTRUCTOR, OTHER)',
  })
  startedBy?: Actor;

  @ApiPropertyOptional({
    description: '수업시작일(첫 수업일) - YYYY-MM-DD 형식의 날짜 문자열',
    example: '2025-03-15',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  })
  @IsOptional()
  @IsString({ message: '수업시작일은 문자열이어야 합니다' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: '수업시작일은 YYYY-MM-DD 형식이어야 합니다',
  })
  start?: string;

  @ApiPropertyOptional({
    description:
      '수업종료일 등록자 구분 - MANAGER: 관리자, INSTRUCTOR: 강사, OTHER: 기타',
    enum: Actor,
    enumName: 'Actor',
    example: Actor.INSTRUCTOR,
  })
  @IsOptional()
  @IsEnum(Actor, {
    message:
      'endedBy는 유효한 Actor 값이어야 합니다 (MANAGER, INSTRUCTOR, OTHER)',
  })
  endedBy?: Actor;

  @ApiPropertyOptional({
    description: '수업종료일(마지막 수업일) - YYYY-MM-DD 형식의 날짜 문자열',
    example: '2025-07-20',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  })
  @IsOptional()
  @IsString({ message: '수업종료일은 문자열이어야 합니다' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: '수업종료일은 YYYY-MM-DD 형식이어야 합니다',
  })
  end?: string;

  @ApiPropertyOptional({
    description: '비고 - 등록/변경 사유나 특이사항 기록 (최대 255자)',
    example: '교재비 변경으로 인한 수정',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: '비고는 문자열이어야 합니다' })
  @MaxLength(255, { message: '비고는 255자를 초과할 수 없습니다' })
  note?: string;

  @ApiPropertyOptional({
    description: '학생별 수업료 - 수정 가능',
    example: 15000,
  })
  @IsOptional()
  @IsInt({ message: '책값은 정수여야 합니다' })
  tuition?: number;

  @ApiPropertyOptional({
    description: '학생별 개별 책값 - 수정 가능',
    example: 5000,
  })
  @IsOptional()
  @IsInt({ message: '책값은 정수여야 합니다' })
  bookFee?: number;

  @ApiPropertyOptional({
    description: '학생별 개별 재료비 - 수정 가능',
    example: 5000,
  })
  @IsOptional()
  @IsInt({ message: '재료비는 정수여야 합니다' })
  materialFee?: number;
}
