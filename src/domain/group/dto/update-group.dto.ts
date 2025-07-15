import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ClassStatus, Weekday } from 'src/common/enums';

/**
 * 반(Group) 정보 수정 DTO
 * - 실제로 업데이트 가능한 필드들만 포함
 * - lessonId, instructorId는 수정 불가 (연관 관계 변경은 별도 프로세스)
 */
export class UpdateGroupDto {
  @ApiPropertyOptional({
    description: '반 이름 - 사용자 정의 반 명칭 (최대 50자)',
    type: String,
    example: '심화 영어 A반',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: '반 이름은 문자열이어야 합니다' })
  @MaxLength(50, { message: '반 이름은 50자 이하여야 합니다' })
  groupName?: string;

  @ApiPropertyOptional({
    description: '수업 장소 - 강의실 또는 장소명 (최대 100자)',
    type: String,
    example: '301호 강의실',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: '수업 장소는 문자열이어야 합니다' })
  @MaxLength(100, { message: '수업 장소는 100자 이하여야 합니다' })
  location?: string;

  @ApiPropertyOptional({
    description: '정원 - 반의 최대 수용 가능 인원 (1~100명)',
    type: Number,
    example: 25,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt({ message: '정원은 정수여야 합니다' })
  @Min(1, { message: '정원은 1명 이상이어야 합니다' })
  @Max(100, { message: '정원은 100명 이하여야 합니다' })
  capacity?: number;

  @ApiPropertyOptional({
    description:
      '허용 학년 - 쉼표로 구분하거나 범위로 표시 (예: "1,2,3" 또는 "1-6" 또는 "1~6")',
    type: String,
    example: '2,3,4',
  })
  @IsOptional()
  @IsString({ message: '허용 학년은 문자열이어야 합니다' })
  @Matches(/^[1-9,\-~\s]+$/, {
    message: '허용 학년은 숫자, 쉼표, 하이픈, 물결표시만 허용됩니다',
  })
  allowedGrades?: string;

  @ApiPropertyOptional({
    description: '수업 요일 - 반복 수업이 진행되는 요일',
    enum: Weekday,
    example: Weekday.TUESDAY,
    type: 'string',
  })
  @IsOptional()
  @IsEnum(Weekday, { message: '올바른 요일을 선택해주세요' })
  weekday?: Weekday;

  @ApiPropertyOptional({
    description: '수업 시작 시간 - HH:MM 형식 (24시간제)',
    type: String,
    example: '16:00',
    pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsOptional()
  @IsString({ message: '수업 시작 시간은 문자열이어야 합니다' })
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: '시간 형식이 올바르지 않습니다 (HH:MM)',
  })
  start?: string;

  @ApiPropertyOptional({
    description:
      '수업 종료 시간 - HH:MM 형식 (24시간제, 시작 시간보다 늦어야 함)',
    type: String,
    example: '16:40',
    pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsOptional()
  @IsString({ message: '수업 종료 시간은 문자열이어야 합니다' })
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: '시간 형식이 올바르지 않습니다 (HH:MM)',
  })
  end?: string;

  @ApiPropertyOptional({
    description: '반 상태 - 반의 현재 운영 상태',
    enum: ClassStatus,
    example: ClassStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ClassStatus, { message: '올바른 반 상태를 선택해주세요' })
  status?: ClassStatus;

  @ApiPropertyOptional({
    description: '수업료 (원) - 학생별 수업료 (0원 이상)',
    type: Number,
    example: 90000,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: '수업료는 정수여야 합니다' })
  @Min(0, { message: '수업료는 0원 이상이어야 합니다' })
  tuition?: number;

  @ApiPropertyOptional({
    description: '도서비 (원) - 교재 구입비 (0원 이상)',
    type: Number,
    example: 20000,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: '도서비는 정수여야 합니다' })
  @Min(0, { message: '도서비는 0원 이상이어야 합니다' })
  bookFee?: number;

  @ApiPropertyOptional({
    description: '재료비 (원) - 수업 재료 구입비 (0원 이상)',
    type: Number,
    example: 15000,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: '재료비는 정수여야 합니다' })
  @Min(0, { message: '재료비는 0원 이상이어야 합니다' })
  materialFee?: number;

  @ApiPropertyOptional({
    description: '비고 - 반에 대한 추가 정보나 특이사항 (최대 255자)',
    type: String,
    example: '중급자 대상 심화반으로 변경',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: '비고는 문자열이어야 합니다' })
  @MaxLength(255, { message: '비고는 255자 이하여야 합니다' })
  note?: string;

  @ApiPropertyOptional({
    description: '강사명 - 담당 강사의 이름 (최대 16자, 한글/영문만 허용)',
    type: String,
    example: '이선생',
    maxLength: 16,
  })
  @IsOptional()
  @IsString({ message: '강사명은 문자열이어야 합니다' })
  @MaxLength(16, { message: '강사명은 16자 이하여야 합니다' })
  instructorName?: string;

  @ApiPropertyOptional({
    description: '강사 전화번호 - 하이픈 없이 숫자만 입력 (10~11자리)',
    type: String,
    example: '01087654321',
  })
  @IsOptional()
  @IsString({ message: '강사 전화번호는 문자열이어야 합니다' })
  instructorPhone?: string;
}
