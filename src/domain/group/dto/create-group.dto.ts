import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
 * 반(Group) 생성 DTO
 * - 수업의 최소 단위로 반을 설정
 * - 필수: weekday, start, end
 * - 선택: groupName, location, capacity, allowedGrades, status, tuition, bookFee, materialFee, note, instructor 정보
 */
export class CreateGroupDto {
  @ApiPropertyOptional({
    description: '반 이름 - 사용자 정의 반 명칭 (최대 50자)',
    type: String,
    example: '초급 영어 A반',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: '반 이름은 문자열이어야 합니다' })
  @MaxLength(50, { message: '반 이름은 50자 이하여야 합니다' })
  groupName?: string;

  @ApiPropertyOptional({
    description: '수업 장소 - 강의실 또는 장소명 (최대 100자)',
    type: String,
    example: '201호 강의실',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: '수업 장소는 문자열이어야 합니다' })
  @MaxLength(100, { message: '수업 장소는 100자 이하여야 합니다' })
  location?: string;

  @ApiPropertyOptional({
    description: '정원 - 반의 최대 수용 가능 인원 (1~100명)',
    type: Number,
    example: 20,
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
    example: '1,2,3',
  })
  @IsOptional()
  @IsString({ message: '허용 학년은 문자열이어야 합니다' })
  @Matches(/^[1-9,\-~\s]+$/, {
    message: '허용 학년은 숫자, 쉼표, 하이픈, 물결표시만 허용됩니다',
  })
  allowedGrades?: string;

  @ApiProperty({
    description: '수업 요일 - 반복 수업이 진행되는 요일',
    enum: Weekday,
    example: Weekday.MONDAY,
    type: 'string',
  })
  @IsEnum(Weekday, { message: '올바른 요일을 선택해주세요' })
  weekday: Weekday;

  @ApiProperty({
    description: '수업 시작 시간 - HH:MM 형식 (24시간제)',
    type: String,
    example: '15:00',
  })
  @IsString({ message: '수업 시작 시간은 문자열이어야 합니다' })
  start: string;

  @ApiProperty({
    description:
      '수업 종료 시간 - HH:MM 형식 (24시간제, 시작 시간보다 늦어야 함)',
    type: String,
    example: '15:40',
  })
  @IsString({ message: '수업 종료 시간은 문자열이어야 합니다' })
  end: string;

  @ApiPropertyOptional({
    description: '반 상태 - 반의 현재 운영 상태',
    enum: ClassStatus,
    default: ClassStatus.PENDING,
    example: ClassStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(ClassStatus, { message: '올바른 반 상태를 선택해주세요' })
  status?: ClassStatus;

  @ApiPropertyOptional({
    description: '수업료 (원) - 학생별 수업료 (0원 이상)',
    type: Number,
    example: 80000,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: '수업료는 정수여야 합니다' })
  @Min(0, { message: '수업료는 0원 이상이어야 합니다' })
  tuition?: number;

  @ApiPropertyOptional({
    description: '도서비 (원) - 교재 구입비 (0원 이상)',
    type: Number,
    example: 15000,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: '도서비는 정수여야 합니다' })
  @Min(0, { message: '도서비는 0원 이상이어야 합니다' })
  bookFee?: number;

  @ApiPropertyOptional({
    description: '재료비 (원) - 수업 재료 구입비 (0원 이상)',
    type: Number,
    example: 10000,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: '재료비는 정수여야 합니다' })
  @Min(0, { message: '재료비는 0원 이상이어야 합니다' })
  materialFee?: number;

  @ApiPropertyOptional({
    description: '비고 - 반에 대한 추가 정보나 특이사항 (최대 255자)',
    type: String,
    example: '초보자 대상 기초반입니다',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: '비고는 문자열이어야 합니다' })
  @MaxLength(255, { message: '비고는 255자 이하여야 합니다' })
  note?: string;

  @ApiPropertyOptional({
    description: '강사명 - 담당 강사의 이름 (최대 16자, 한글/영문만 허용)',
    type: String,
    example: '김선생',
    maxLength: 16,
  })
  @IsOptional()
  @IsString({ message: '강사명은 문자열이어야 합니다' })
  @MaxLength(16, { message: '강사명은 16자 이하여야 합니다' })
  instructorName?: string;

  @ApiPropertyOptional({
    description: '강사 전화번호 - 하이픈 없이 숫자만 입력 (10~11자리)',
    type: String,
    example: '01012345678',
  })
  @IsOptional()
  @IsString({ message: '강사 전화번호는 문자열이어야 합니다' })
  instructorPhone?: string;

  @ApiPropertyOptional({
    description: '강사 ID - 시스템에 등록된 강사의 고유 식별자',
    type: Number,
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt({ message: '강사 ID는 정수여야 합니다' })
  @Min(1, { message: '강사 ID는 1 이상이어야 합니다' })
  instructorId?: number;

  @ApiPropertyOptional({
    description: '수업 ID - 시스템에 등록된 수업의 고유 식별자',
    type: Number,
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt({ message: '수업 ID는 정수여야 합니다' })
  @Min(1, { message: '수업 ID는 1 이상이어야 합니다' })
  lessonId?: number;
}

/**
 * 강사 정보를 반드시 포함한 반 생성 DTO
 * - CreateGroupDto를 확장하여 강사 정보를 필수로 요구
 * - 새로운 강사와 함께 반을 생성할 때 사용
 */
export class CreateGroupWithInstructorDto extends CreateGroupDto {
  @ApiPropertyOptional({
    description:
      '강사 ID - 기존 강사를 지정할 때 사용 (instructorName, instructorPhone이 함께 제공되면 해당 값들로 업데이트)',
    type: Number,
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt({ message: '강사 ID는 정수여야 합니다' })
  @Min(1, { message: '강사 ID는 1 이상이어야 합니다' })
  declare instructorId?: number;

  @ApiProperty({
    description:
      '강사명 - 담당 강사의 이름 (instructorId가 있으면 업데이트용, 없으면 새 강사 생성 시 필수, 최대 16자)',
    type: String,
    example: '김선생',
    maxLength: 16,
    required: false,
  })
  @IsString({ message: '강사명은 문자열이어야 합니다' })
  @MaxLength(16, { message: '강사명은 16자 이하여야 합니다' })
  declare instructorName?: string;

  @ApiProperty({
    description:
      '강사 전화번호 - 하이픈 없이 숫자만 입력 (instructorId가 있으면 업데이트용, 없으면 새 강사 생성 시 필수, 10~11자리)',
    type: String,
    example: '01012345678',
    required: false,
  })
  @IsString({ message: '강사 전화번호는 문자열이어야 합니다' })
  declare instructorPhone?: string;

  @ApiPropertyOptional({
    description: '반 ID - 기존 반을 수정할 때 사용하는 식별자',
    type: Number,
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt({ message: '반 ID는 정수여야 합니다' })
  @Min(1, { message: '반 ID는 1 이상이어야 합니다' })
  id?: number;
}
