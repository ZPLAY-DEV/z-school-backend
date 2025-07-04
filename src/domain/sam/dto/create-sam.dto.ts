import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateInstructorDto } from 'src/domain/instructor/dto/create-instructor.dto';

export class CreateSamDto {
  @ApiProperty({
    description: '🈳 InstructorId',
    type: Number,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  instructorId?: number;

  @ApiProperty({
    description: '🈵 School ID (number)',
    type: Number,
    example: 1,
  })
  @IsInt()
  schoolId: number;

  @ApiProperty({
    description: '🈵 강사 학교별 별칭',
    example: '홍길동',
    type: String,
    required: true,
  })
  @IsString()
  @MaxLength(16)
  alias: string;

  @ApiProperty({
    description: '🈳 강사 평가점수',
    example: 80,
    type: Number,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  score?: number;

  @ApiProperty({
    description: '🈳 교재/재료비 수정 권한 여부',
    type: Boolean,
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  editFeePermission?: boolean;

  @ApiProperty({
    description: '🈳 수강생 추가/취소 권한 여부',
    type: Boolean,
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  editPickPermission?: boolean;

  @ApiProperty({
    description: '🈳 보고',
    example: '특이사항 정리',
    type: String,
    required: false,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  note?: string | null;

  @ApiProperty({
    description: '🈵 강사 정보',
    type: CreateInstructorDto,
    required: true,
  })
  @ValidateNested()
  @IsDefined()
  @Type(() => CreateInstructorDto)
  instructor: CreateInstructorDto;
}
