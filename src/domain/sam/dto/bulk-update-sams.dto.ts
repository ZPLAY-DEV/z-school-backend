import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Min
} from 'class-validator';

export class BulkUpdateSamsDto {
  @ApiProperty({
    description: '업데이트할 SAM ID 목록',
    type: [Number],
    example: [1, 2, 3, 4],
    required: true,
  })
  @IsArray({ message: 'SAM ID 목록은 배열이어야 합니다' })
  @ArrayMinSize(1, { message: '최소 1개 이상의 SAM ID가 필요합니다' })
  @IsInt({ each: true, message: '각 SAM ID는 정수여야 합니다' })
  samIds: number[];

  @ApiPropertyOptional({
    description: '평점 - 담임쌤의 평가 점수 (0~100점)',
    type: Number,
    example: 85,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: '평점은 숫자여야 합니다' })
  @Min(0, { message: '평점은 0 이상이어야 합니다' })
  score?: number;

  @ApiPropertyOptional({
    description: '수업료 편집 권한',
    type: Boolean,
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: '수업료 편집 권한은 불린 값이어야 합니다' })
  editFeePermission?: boolean;

  @ApiPropertyOptional({
    description: '픽업 편집 권한',
    type: Boolean,
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: '픽업 편집 권한은 불린 값이어야 합니다' })
  editPickPermission?: boolean;
}
