import { ApiProperty } from '@nestjs/swagger';
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
    description: '비고 - 담임쌤에 대한 추가 정보나 특이사항 (최대 255자)',
    type: String,
    example: '수학 전문 강사, 학생들과 소통이 원활함',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '비고는 문자열이어야 합니다' })
  @MaxLength(255, { message: '비고는 255자 이하여야 합니다' })
  note?: string;

  @ApiProperty({
    description: '강사 ID',
    type: Number,
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: '강사 ID는 정수여야 합니다' })
  @Min(1, { message: '강사 ID는 1 이상이어야 합니다' })
  instructorId?: number;

  @ApiProperty({
    description: '🈳 강사 정보 (부분 수정)',
    type: UpdateInstructorDto,
    required: false,
  })
  @ValidateNested()
  @IsOptional()
  @Type(() => UpdateInstructorDto)
  instructor?: UpdateInstructorDto;
}
