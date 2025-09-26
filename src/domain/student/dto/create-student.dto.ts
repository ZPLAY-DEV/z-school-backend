import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { StudentStatus } from 'src/common/enums';
import { CreateParentDto } from 'src/domain/parent/dto/create-parent.dto';
import { NextStopDto } from 'src/domain/student/dto/next-stop.dto';

/**
 * 학생 생성 DTO
 * - 새로운 학생을 시스템에 등록할 때 사용
 * - 필수: schoolId, grade, parent (또는 parentId)
 * - 부모 연결 방식:
 *   - 기존 부모 연결: parent.id 포함 (다른 parent 필드들은 무시됨)
 *   - 새로운 부모 생성: parent.id 제외, parent.phone 필수
 *   - 직접 참조: parentId 제공 (parent 객체 무시됨)
 * - 선택: class, studentCode, name, phone, monday~saturday(요일별 보호자 정보), status, note
 */
export class CreateStudentDto {
  @ApiProperty({
    description: '학교 ID - 학생이 소속될 학교의 고유 식별자 (필수)',
    type: Number,
    example: 1,
    minimum: 1,
  })
  @IsNotEmpty({ message: '학교 ID는 필수입니다' })
  @IsInt({ message: '학교 ID는 정수여야 합니다' })
  schoolId: number;

  @ApiProperty({
    description: '학년 - 학생의 현재 학년 (1~6학년) (필수)',
    type: Number,
    example: 3,
    minimum: 1,
    maximum: 6,
  })
  @IsNotEmpty()
  @IsInt({ message: '학년은 정수여야 합니다' })
  @Min(1, { message: '학년은 1 이상이어야 합니다' })
  @Max(6, { message: '학년은 6 이하여야 합니다' })
  grade: number;

  @ApiProperty({
    description: '반 - 학생의 소속 반 (최대 8자)',
    type: String,
    example: '5',
    maxLength: 8,
  })
  @IsNotEmpty()
  @IsString({ message: '반은 문자열이어야 합니다' })
  @MaxLength(8, { message: '반은 8자 이하여야 합니다' })
  class: string;

  @ApiProperty({
    description: '학번/번호 - 학교 내 학생 고유번호 (1~99999)',
    type: Number,
    example: 4,
    minimum: 1,
    maximum: 99,
  })
  @IsNotEmpty()
  @IsInt({ message: '학번은 정수여야 합니다' })
  @Type(() => Number)
  @Min(1, { message: '학번은 1 이상이어야 합니다' })
  @Max(99, { message: '학번은 99 이하여야 합니다' })
  studentCode: number;

  @ApiProperty({
    description: '학생 이름 - 학생의 실명 (최대 16자, 한글/영문만 허용)',
    type: String,
    example: '홍길동',
    maxLength: 16,
  })
  @IsNotEmpty()
  @IsString({ message: '이름은 문자열이어야 합니다' })
  @MinLength(2, { message: '이름이 없습니다.' })
  @MaxLength(16, { message: '이름은 최대 16자까지만 허용됩니다.' })
  name: string;

  @ApiPropertyOptional({
    description:
      '재학 상태 - ATTENDING: 재학중, TRANSFERRED: 전학 (기본값: ATTENDING)',
    enum: StudentStatus,
    enumName: 'StudentStatus',
    example: StudentStatus.ATTENDING,
    default: StudentStatus.ATTENDING,
  })
  @IsOptional()
  @IsEnum(StudentStatus, {
    message:
      'status는 유효한 StudentStatus 값이어야 합니다 (ATTENDING, TRANSFERRED)',
  })
  status: StudentStatus = StudentStatus.ATTENDING;

  @ApiPropertyOptional({
    description: '학생 전화번호',
    type: String,
    example: '010-1234-5678',
  })
  @IsOptional()
  @IsString({ message: '학생 전화번호는 문자열이어야 합니다' })
  phone?: string;

  @IsOptional()
  @IsString({ message: '하교후 가는 곳은 문자열이어야 합니다' })
  nextStop?: string | null;

  @ApiPropertyOptional({
    description: '요일별 하교장소',
    type: [NextStopDto],
    example: 'comma separated string',
    maxLength: 255,
  })
  @IsOptional()
  @IsArray({ message: '하교후 가는 곳은 문자열이어야 합니다' })
  @Type(() => NextStopDto)
  nextStops?: NextStopDto[];

  @ApiPropertyOptional({
    description: '비고 - 학생에 대한 추가 정보나 특이사항 (최대 255자)',
    type: String,
    example: '알레르기: 견과류 주의 필요',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: '비고는 문자열이어야 합니다' })
  @MaxLength(255, { message: '비고는 255자 이하여야 합니다' })
  note?: string;

  @ApiPropertyOptional({
    description: `부모 ID - 기존 등록된 부모와 직접 연결할 때 사용 (선택)
    
🏷️ 부모 연결 방식 우선순위:
1️⃣ parentId 우선: 제공시 parent 객체 무시
2️⃣ parent.id: 기존 부모 연결
3️⃣ parent 객체: 새로운 부모 생성`,
    type: Number,
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt({ message: '부모 ID는 정수여야 합니다' })
  @Min(1, { message: '부모 ID는 1 이상이어야 합니다' })
  parentId?: number;

  @ApiProperty({
    description: `보호자 정보 - 학생의 학부모/보호자 정보 (parentId 미제공시 필수)

🏷️ 두 가지 연결 방식:
✅ 기존 부모 연결: parent.id만 제공 (다른 필드들은 무시됨)
✅ 새로운 부모 생성: parent.id 제외, parent.phone 필수

⚠️ parentId가 제공되면 이 객체는 무시됩니다`,
    type: CreateParentDto,
  })
  @IsDefined({ message: '보호자 정보는 필수입니다' })
  @ValidateNested({ message: '보호자 정보가 올바르지 않습니다' })
  @Type(() => CreateParentDto)
  parent: CreateParentDto;
}
