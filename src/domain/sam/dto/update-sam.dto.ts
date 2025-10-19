import { IsEnum } from '@nestjs/class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { SamStatus } from 'src/common/enums';
import { UpdateInstructorDto } from 'src/domain/instructor/dto/update-instructor.dto';

export class UpdateSamDto {
  @ApiProperty({
    description: '학교 ID',
    type: Number,
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: '학교 ID는 정수여야 합니다' })
  schoolId?: number;

  @ApiProperty({
    description: '별칭 - 담임쌤의 호칭/닉네임 (최대 16자)',
    type: String,
    example: '홍선생',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '별칭은 문자열이어야 합니다' })
  @MaxLength(16, { message: '별칭은 16자 이하여야 합니다' })
  alias?: string;

  @ApiProperty({
    description: '평점 - 담임쌤의 평가 점수 (0~100점)',
    type: Number,
    example: 85,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: '평점은 숫자여야 합니다' })
  @Min(0, { message: '평점은 0 이상이어야 합니다' })
  score?: number;

  @ApiProperty({
    description: '수업료 편집 권한',
    type: Boolean,
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: '수업료 편집 권한은 불린 값이어야 합니다' })
  editFeePermission?: boolean;

  @ApiProperty({
    description: '픽업 편집 권한',
    type: Boolean,
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: '픽업 편집 권한은 불린 값이어야 합니다' })
  editPickPermission?: boolean;

  @ApiProperty({
    description: '상태',
    type: String,
    example: 'ACTIVE',
    required: false,
  })
  @IsOptional()
  @IsEnum(SamStatus, { message: '상태는 유효, 전학 중 하나여야 합니다' })
  status?: SamStatus;

  @ApiProperty({
    description: '비고 - 담임쌤에 대한 추가 정보나 특이사항 (최대 255자)',
    type: String,
    example: '수학 전문 강사, 학생들과 소통이 원활함',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '비고는 문자열이어야 합니다' })
  @MaxLength(255, { message: '비고는 255자 이하여야 합니다' })
  note?: string;

  @ApiPropertyOptional({
    description: `강사 ID - 기존 등록된 강사로 변경할 때 사용 (선택)
instructorId 제공시 instructor 객체 무시`,
    type: Number,
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: '강사 ID는 정수여야 합니다' })
  instructorId?: number;

  @ApiProperty({
    description:
      '🈳 강사 정보 수정 ⚠️ instructorId가 제공되면 이 객체는 무시됩니다',
    type: UpdateInstructorDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested({ message: '강사 정보가 올바르지 않습니다' })
  @Type(() => UpdateInstructorDto)
  instructor?: UpdateInstructorDto;
}
