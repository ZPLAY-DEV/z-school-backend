import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateInstructorDto } from 'src/domain/instructor/dto/create-instructor.dto';

export class CreateSamDto {
  @ApiProperty({
    description: '🈳 강사 ID',
    type: Number,
    required: false,
    example: 1,
  })
  @IsInt()
  @IsOptional()
  instructorId?: number;

  @ApiProperty({
    description: '🈵 School ID (number)',
    type: Number,
    required: true,
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  schoolId: number;

  @ApiProperty({
    description: '🈵 강사 학교별 별칭',
    example: '퉁퉁쌤',
    type: String,
    required: true,
  })
  @IsString()
  @MaxLength(16)
  alias: string;

  @ApiProperty({
    description: '🈳 강사 평가점수',
    example: '80',
    type: Number,
    required: true,
  })
  @IsNumber()
  @IsOptional()
  score?: number;

  @ApiProperty({
    description: '🈳 교재/재료비 수정 권한 여부',
    example: true,
    type: Boolean,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  editFeePermission?: boolean;

  @ApiProperty({
    description: '🈳 수강 추가/취소 권한 여부',
    example: true,
    type: Boolean,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  editEnrollmentPermission?: boolean;

  @ApiProperty({
    description: '🈳 내용',
    example: '특이사항 없음',
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
    example: {
      name: '홍길동',
      phone: '01012345678',
    },
  })
  @ValidateNested()
  @Type(() => CreateInstructorDto)
  instructor: CreateInstructorDto;
}
