import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateInstructorDto } from 'src/domain/instructor/dto/create-instructor.dto';

/**
 * 담임쌤 생성 DTO
 * - 새로운 담임쌤을 시스템에 등록할 때 사용
 * - 필수: schoolId, alias, instructor (또는 instructorId)
 * - instructor 연결 방식:
 *   - instructor.id 포함시, 기존 instructor 를 찾아서 해당 instructor 의 정보 수정
 *   - instructor.id 미포함시, phone 으로 instructor 가 있는지 검사
 *     - 기존 insturctor 발견시, 해당 instructor 의 정보 수정
 *     - 기존 insturctor 미발견시, 새로운 instructor 생성
 */
export class CreateSamDto {
  @ApiProperty({
    description:
      '학교 ID - 담임쌤이 소속될 학교의 고유 식별자. 생략시 param 에서 전달',
    type: Number,
    example: 1,
    minimum: 1,
  })
  @IsInt({ message: '학교 ID는 정수여야 합니다' })
  @IsOptional()
  schoolId?: number;

  @ApiProperty({
    description:
      '별칭 - 담임쌤의 호칭/닉네임 (필수, 최대 16자, 한글/영문/숫자/공백만 허용)',
    type: String,
    example: '홍선생',
    maxLength: 16,
  })
  @IsString({ message: '별칭은 문자열이어야 합니다' })
  @MaxLength(16, { message: '별칭은 16자 이하여야 합니다' })
  alias: string;

  @ApiPropertyOptional({
    description: '평점 - 담임쌤의 평가 점수 (0~100점, 기본값: 0)',
    type: Number,
    example: 85,
    minimum: 0,
    maximum: 100,
    default: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: '평점은 숫자여야 합니다' })
  @Min(0, { message: '평점은 0 이상이어야 합니다' })
  score?: number;

  @ApiPropertyOptional({
    description:
      '수업료 편집 권한 - 수업료 관련 정보 수정 가능 여부 (기본값: false)',
    type: Boolean,
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: '수업료 편집 권한은 불린 값이어야 합니다' })
  editFeePermission?: boolean;

  @ApiPropertyOptional({
    description:
      '픽업 편집 권한 - 픽업 관련 정보 수정 가능 여부 (기본값: false)',
    type: Boolean,
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: '픽업 편집 권한은 불린 값이어야 합니다' })
  editPickPermission?: boolean;

  @ApiPropertyOptional({
    description: '비고 - 담임쌤에 대한 추가 정보나 특이사항 (최대 255자)',
    type: String,
    example: '수학 전문 강사, 학생들과 소통이 원활함',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: '비고는 문자열이어야 합니다' })
  @MaxLength(255, { message: '비고는 255자 이하여야 합니다' })
  note?: string;

  @ApiPropertyOptional({
    description: `강사 ID - 기존 등록된 강사와 직접 연결할 때 사용 (선택)
    
🏷️ 강사 연결 방식 우선순위:
1️⃣ instructorId 우선: 제공시 instructor 객체 무시
2️⃣ instructor.id: 기존 강사 연결
3️⃣ instructor 객체: 새로운 강사 생성`,
    type: Number,
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt({ message: '강사 ID는 정수여야 합니다' })
  @Min(1, { message: '강사 ID는 1 이상이어야 합니다' })
  instructorId?: number;

  @ApiProperty({
    description: `강사 정보 - 담임쌤의 강사 정보 (instructorId 미제공시 필수)

🏷️ 두 가지 연결 방식:
✅ 기존 강사 연결: instructor.id만 제공 (다른 필드들은 무시됨)
✅ 새로운 강사 생성: instructor.id 제외, instructor.phone 필수

⚠️ instructorId가 제공되면 이 객체는 무시됩니다`,
    type: CreateInstructorDto,
  })
  @IsDefined({ message: '강사 정보는 필수입니다' })
  @ValidateNested({ message: '강사 정보가 올바르지 않습니다' })
  @Type(() => CreateInstructorDto)
  instructor: CreateInstructorDto;
}
