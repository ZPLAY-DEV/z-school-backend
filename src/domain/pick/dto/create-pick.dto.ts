import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Actor } from 'src/common/enums';

export class CreatePickDto {
  @ApiProperty({
    description: '반 ID - 학생을 등록할 그룹(반)의 고유 식별자',
    example: 1,
    minimum: 1,
  })
  @IsInt({ message: '반 ID는 정수여야 합니다' })
  @IsPositive({ message: '반 ID는 1 이상이어야 합니다' })
  groupId: number;

  @ApiProperty({
    description: '학생 ID - 반에 등록될 학생의 고유 식별자',
    example: 123,
    minimum: 1,
  })
  @IsInt({ message: '학생 ID는 정수여야 합니다' })
  @IsPositive({ message: '학생 ID는 1 이상이어야 합니다' })
  studentId: number;

  @ApiProperty({
    description: 'Offering ID - 수강신청 상품의 고유 식별자',
    example: 1,
    minimum: 1,
  })
  @IsInt({ message: 'Offering ID는 정수여야 합니다' })
  @IsOptional()
  @IsPositive({ message: 'Offering ID는 1 이상이어야 합니다' })
  offeringId?: number;

  @ApiProperty({
    description: '학기 ID - 해당 학기의 고유 식별자',
    example: 1,
    minimum: 1,
  })
  @IsInt({ message: '학기 ID는 정수여야 합니다' })
  @IsOptional()
  @IsPositive({ message: '학기 ID는 1 이상이어야 합니다' })
  termId?: number;

  @ApiPropertyOptional({
    description:
      '수업시작일 등록자 구분 - 누가 수업시작일을 등록했는지 기록. MANAGER: 매니저, INSTRUCTOR: 강사, OTHER: 기타',
    enum: Actor,
    enumName: 'Actor',
    example: Actor.MANAGER,
    default: null,
  })
  @IsOptional()
  @IsEnum(Actor, {
    message:
      'startedBy는 유효한 Actor 값이어야 합니다 (MANAGER, INSTRUCTOR, OTHER)',
  })
  startedBy?: Actor | null;

  @ApiProperty({
    description:
      '수업시작일(첫 수업일) - YYYY-MM-DD 형식의 날짜 문자열. 해당 날짜부터 학생이 수업에 참여함',
    example: '2025-03-15',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  })
  @IsNotEmpty({ message: '수업시작일은 필수입니다' })
  @IsString({ message: '수업시작일은 문자열이어야 합니다' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: '수업시작일은 YYYY-MM-DD 형식이어야 합니다',
  })
  @IsOptional()
  start?: string;

  @ApiPropertyOptional({
    description:
      '수업종료일 등록자 구분 - 누가 수업종료일을 등록했는지 기록. MANAGER: 매니저, INSTRUCTOR: 강사, OTHER: 기타',
    enum: Actor,
    enumName: 'Actor',
    example: Actor.INSTRUCTOR,
    default: null,
  })
  @IsOptional()
  @IsEnum(Actor, {
    message:
      'endedBy는 유효한 Actor 값이어야 합니다 (MANAGER, INSTRUCTOR, OTHER)',
  })
  endedBy?: Actor | null;

  @ApiProperty({
    description:
      '수업종료일(마지막 수업일) - YYYY-MM-DD 형식의 날짜 문자열. 해당 날짜까지만 학생이 수업에 참여함',
    example: '2025-07-20',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  })
  @IsNotEmpty({ message: '수업종료일은 필수입니다' })
  @IsString({ message: '수업종료일은 문자열이어야 합니다' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: '수업종료일은 YYYY-MM-DD 형식이어야 합니다',
  })
  @IsOptional()
  end?: string;

  @ApiPropertyOptional({
    description: '비고 - 등록/변경 사유나 특이사항 기록 (최대 255자)',
    example: '중간 전학으로 인한 반 편입',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: '비고는 문자열이어야 합니다' })
  @MaxLength(255, { message: '비고는 255자를 초과할 수 없습니다' })
  note?: string;
}

/**
 * 학생 반 등록 시작 DTO
 * - 중간에 반에 참여하는 학생을 등록할 때 사용
 * - 필수: groupId, studentId, offeringId, termId, start
 * - 선택: bookFee, materialFee, note
 * - startedBy는 서버에서 현재 사용자 role로 자동 설정됨
 */
export class StartPickDto extends CreatePickDto {
  @ApiProperty({
    description:
      '수업시작일 등록자 구분 - 누가 수업시작일을 등록했는지 기록. MANAGER: 매니저, INSTRUCTOR: 강사, OTHER: 기타',
    enum: Actor,
    example: Actor.MANAGER,
  })
  @IsNotEmpty({ message: 'startedBy는 필수입니다' })
  @IsEnum(Actor, {
    message:
      'startedBy는 유효한 Actor 값이어야 합니다 (MANAGER, INSTRUCTOR, OTHER)',
  })
  declare startedBy: Actor;

  @ApiProperty({
    description:
      '수업시작일(첫 수업일) - YYYY-MM-DD 형식의 날짜 문자열. 해당 날짜부터 학생이 수업에 참여함',
    example: '2025-03-15',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  })
  @IsNotEmpty({ message: '수업시작일은 필수입니다' })
  @IsString({ message: '수업시작일은 문자열이어야 합니다' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: '수업시작일은 YYYY-MM-DD 형식이어야 합니다',
  })
  declare start: string;
}

/**
 * 학생 반 등록 종료 DTO
 * - 중간에 반에서 나가는 학생을 처리할 때 사용
 * - 필수: groupId, studentId, end
 * - 선택: offeringId, termId, note
 * - endedBy는 서버에서 현재 사용자 role로 자동 설정됨
 */
export class EndPickDto extends CreatePickDto {
  @ApiProperty({
    description:
      '수업종료일 등록자 구분 - 누가 수업종료일을 등록했는지 기록. MANAGER: 매니저, INSTRUCTOR: 강사, OTHER: 기타',
    enum: Actor,
    enumName: 'Actor',
    example: Actor.MANAGER,
  })
  @IsEnum(Actor, {
    message:
      'endedBy는 유효한 Actor 값이어야 합니다 (MANAGER, INSTRUCTOR, OTHER)',
  })
  declare endedBy: Actor;

  @ApiProperty({
    description:
      '수업종료일(마지막 수업일) - YYYY-MM-DD 형식의 날짜 문자열. 해당 날짜까지만 학생이 수업에 참여함',
    example: '2025-07-20',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  })
  @IsNotEmpty({ message: '수업종료일은 필수입니다' })
  @IsString({ message: '수업종료일은 문자열이어야 합니다' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: '수업종료일은 YYYY-MM-DD 형식이어야 합니다',
  })
  declare end: string;
}
