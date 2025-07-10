import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { StudentStatus } from 'src/common/enums';
import { UpdateParentDto } from 'src/domain/parent/dto/update-parent.dto';

/**
 * 학생 정보 수정 DTO
 * - 실제로 업데이트 가능한 필드들만 포함
 * - schoolId는 수정 불가 (학교 변경은 전학 프로세스를 통해서만)
 * - parentId와 parent는 선택적 업데이트 가능
 */
export class UpdateStudentDto {
  @ApiPropertyOptional({
    description: '학년 - 학생의 현재 학년 (1~12학년)',
    type: Number,
    example: 4,
    minimum: 1,
    maximum: 12,
  })
  @IsOptional()
  @IsInt({ message: '학년은 정수여야 합니다' })
  @Min(1, { message: '학년은 1 이상이어야 합니다' })
  @Max(12, { message: '학년은 12 이하여야 합니다' })
  grade?: number;

  @ApiPropertyOptional({
    description: '반 - 학생의 소속 반 (최대 8자)',
    type: String,
    example: '4-1',
    maxLength: 8,
  })
  @IsOptional()
  @IsString({ message: '반은 문자열이어야 합니다' })
  @MaxLength(8, { message: '반은 8자 이하여야 합니다' })
  class?: string;

  @ApiPropertyOptional({
    description: '학번/번호 - 학교 내 학생 고유번호 (1~99999)',
    type: Number,
    example: 2024001,
    minimum: 1,
    maximum: 99999,
  })
  @IsOptional()
  @IsInt({ message: '학번은 정수여야 합니다' })
  @Type(() => Number)
  @Min(1, { message: '학번은 1 이상이어야 합니다' })
  @Max(99999, { message: '학번은 99999 이하여야 합니다' })
  studentCode?: number;

  @ApiPropertyOptional({
    description: '학생 이름 - 학생의 실명 (최대 16자, 한글/영문/숫자만 허용)',
    type: String,
    example: '김학생',
    maxLength: 16,
    pattern: '^[가-힣a-zA-Z0-9\\s]+$',
  })
  @IsOptional()
  @IsString({ message: '학생 이름은 문자열이어야 합니다' })
  @MaxLength(16, { message: '학생 이름은 16자 이하여야 합니다' })
  @Matches(/^[가-힣a-zA-Z0-9\s]+$/, {
    message: '학생 이름은 한글, 영문, 숫자, 공백만 허용됩니다',
  })
  name?: string;

  @ApiPropertyOptional({
    description:
      '학생 전화번호 - 학생 개인 휴대폰 번호 (하이픈 없이 숫자만, 최대 16자)',
    type: String,
    example: '01098765432',
    maxLength: 16,
    pattern: '^[0-9]+$',
  })
  @IsOptional()
  @IsString({ message: '학생 전화번호는 문자열이어야 합니다' })
  @MaxLength(16, { message: '학생 전화번호는 16자 이하여야 합니다' })
  @Matches(/^[0-9]+$/, { message: '학생 전화번호는 숫자만 입력해주세요' })
  phone?: string;

  @ApiPropertyOptional({
    description:
      '귀가 동행인 전화번호 - 하교시 함께 가는 사람의 연락처 (하이픈 없이 숫자만, 최대 16자)',
    type: String,
    example: '01011112222',
    maxLength: 16,
    pattern: '^[0-9]+$',
  })
  @IsOptional()
  @IsString({ message: '귀가 동행인 전화번호는 문자열이어야 합니다' })
  @MaxLength(16, { message: '귀가 동행인 전화번호는 16자 이하여야 합니다' })
  @Matches(/^[0-9]+$/, {
    message: '귀가 동행인 전화번호는 숫자만 입력해주세요',
  })
  escortPhone?: string;

  @ApiPropertyOptional({
    description: '하교 방법 - 학생의 주요 하교 수단 (최대 32자)',
    type: String,
    example: '도보',
    maxLength: 32,
  })
  @IsOptional()
  @IsString({ message: '하교 방법은 문자열이어야 합니다' })
  @MaxLength(32, { message: '하교 방법은 32자 이하여야 합니다' })
  homeTransit?: string;

  @ApiPropertyOptional({
    description: '하교후 가는 곳 - 하교 후 주로 향하는 장소 (최대 32자)',
    type: String,
    example: '집',
    maxLength: 32,
  })
  @IsOptional()
  @IsString({ message: '하교후 가는 곳은 문자열이어야 합니다' })
  @MaxLength(32, { message: '하교후 가는 곳은 32자 이하여야 합니다' })
  nextStop?: string;

  @ApiPropertyOptional({
    description: '재학 상태 - ATTENDING: 재학중, TRANSFERRED: 전학',
    enum: StudentStatus,
    enumName: 'StudentStatus',
    example: StudentStatus.ATTENDING,
  })
  @IsOptional()
  @IsEnum(StudentStatus, {
    message:
      'status는 유효한 StudentStatus 값이어야 합니다 (ATTENDING, TRANSFERRED)',
  })
  status?: StudentStatus;

  @ApiPropertyOptional({
    description: '비고 - 학생에 대한 추가 정보나 특이사항 (최대 255자)',
    type: String,
    example: '집중력 향상을 위해 앞자리 배치 요청',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: '비고는 문자열이어야 합니다' })
  @MaxLength(255, { message: '비고는 255자 이하여야 합니다' })
  note?: string;

  @ApiPropertyOptional({
    description: `부모 ID - 기존 등록된 부모로 변경할 때 사용 (선택)
    
🏷️ 부모 변경: parentId 제공시 parent 객체 무시`,
    type: Number,
    example: 2,
    minimum: 1,
  })
  @IsOptional()
  @IsInt({ message: '부모 ID는 정수여야 합니다' })
  @Min(1, { message: '부모 ID는 1 이상이어야 합니다' })
  parentId?: number;

  @ApiPropertyOptional({
    description: `보호자 정보 수정 - 학생의 학부모/보호자 정보 업데이트 (선택)
    
⚠️ parentId가 제공되면 이 객체는 무시됩니다`,
    type: UpdateParentDto,
  })
  @IsOptional()
  @ValidateNested({ message: '보호자 정보가 올바르지 않습니다' })
  @Type(() => UpdateParentDto)
  parent?: UpdateParentDto;
}
