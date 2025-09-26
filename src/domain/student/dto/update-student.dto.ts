import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { StudentStatus } from 'src/common/enums';
import { UpdateParentDto } from 'src/domain/parent/dto/update-parent.dto';
import { NextStopDto } from './next-stop.dto';

/**
 * 학생 정보 수정 DTO
 * - 실제로 업데이트 가능한 필드들만 포함
 * - schoolId는 수정 불가 (학교 변경은 전학 프로세스를 통해서만)
 * - parentId와 parent는 선택적 업데이트 가능
 */
export class UpdateStudentDto {
  @ApiPropertyOptional({
    description: '학년 - 학생의 현재 학년 (1~6학년)',
    type: Number,
    example: 4,
    minimum: 1,
    maximum: 6,
  })
  @IsOptional()
  @IsInt({ message: '학년은 정수여야 합니다' })
  @Min(1, { message: '학년은 1 이상이어야 합니다' })
  @Max(6, { message: '학년은 6 이하여야 합니다' })
  grade?: number;

  @ApiPropertyOptional({
    description: '반 - 학생의 소속 반 (최대 8자)',
    type: String,
    example: '4',
    maxLength: 8,
  })
  @IsOptional()
  @IsString({ message: '반은 문자열이어야 합니다' })
  @MaxLength(8, { message: '반은 8자 이하여야 합니다' })
  class?: string;

  @ApiPropertyOptional({
    description: '학번/번호 - 반 번호',
    type: Number,
    example: 20,
  })
  @IsOptional()
  @IsInt({ message: '번호는 정수여야 합니다' })
  studentCode?: number;

  @ApiPropertyOptional({
    description: '학생 이름 - 학생의 실명 (최대 16자, 한글/영문/숫자만 허용)',
    type: String,
    example: '김학생',
    maxLength: 16,
  })
  @IsOptional()
  @IsString({ message: '학생 이름은 문자열이어야 합니다' })
  @MaxLength(16, { message: '학생 이름은 16자 이하여야 합니다' })
  name?: string;

  @ApiPropertyOptional({
    description: '학생 전화번호',
    type: String,
    example: '01098765432',
  })
  @IsOptional()
  @IsString({ message: '학생 전화번호는 문자열이어야 합니다' })
  phone?: string;

  @IsOptional()
  @IsString({ message: '하교후 가는 곳은 문자열이어야 합니다' })
  nextStop?: string | null;

  @ApiPropertyOptional({
    description: '요일별 하교장소 정보 (배열 형식 - 권장)',
    type: [NextStopDto],
    example: [
      { place: '집', name: '엄마', phone: '01012345678' },
      { place: '학원', name: null, phone: null },
    ],
  })
  @IsOptional()
  @ValidateNested({ each: true, message: '하교장소 정보가 올바르지 않습니다' })
  @Type(() => NextStopDto)
  nextStops?: NextStopDto[];

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
    
🏷️ 부모 연결 방식 우선순위:
1️⃣ parentId 우선: 제공시 parent 객체 무시
2️⃣ parent.id: 기존 부모 연결
3️⃣ parent 객체: 전화번호로 기존 부모 찾기 또는 새로 생성`,
    type: Number,
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: '부모 ID는 정수여야 합니다' })
  parentId?: number;

  @ApiPropertyOptional({
    description: `보호자 정보 수정
    
🏷️ 두 가지 연결 방식:
✅ 기존 부모 연결: parent.id만 제공 (다른 필드들은 무시됨)
✅ 새로운 부모 생성: parent.id 제외, parent.phone 필수

⚠️ parentId가 제공되면 이 객체는 무시됩니다`,
    type: UpdateParentDto,
  })
  @IsOptional()
  @ValidateNested({ message: '보호자 정보가 올바르지 않습니다' })
  @Type(() => UpdateParentDto)
  parent?: UpdateParentDto;
}
