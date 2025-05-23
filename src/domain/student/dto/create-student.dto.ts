import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested
} from 'class-validator';
import { StudentStatus } from 'src/common/enums';
import { CreateParentDto } from 'src/domain/parent/dto/create-parent.dto';

export class CreateStudentDto {
  @ApiProperty({
    description: '🈳 학부모 ID',
    type: Number,
    required: false,
    example: 1,
  })
  @IsInt()
  @IsOptional()
  parentId?: number;

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
    description: '🈵 학년 (up to 8 characters)',
    required: true,
    type: String,
    example: '1',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(8)
  grade: string;

  @ApiProperty({
    description: '🈳 반 (up to 8 characters)',
    required: false,
    type: String,
    example: '1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  class?: string;

  @ApiProperty({
    description: '🈳 학번/번호 ( number )',
    required: false,
    type: Number,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  studentCode?: number;

  @ApiProperty({
    description: '🈳 학생 이름 (up to 16 characters)',
    required: false,
    type: String,
    example: '홍길동',
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  name?: string;

  @ApiProperty({
    description: '🈳 학생 전화번호 (up to 16 characters)',
    required: false,
    type: String,
    example: '01012345678',
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  phone?: string;

  @ApiProperty({
    description: '🈳 귀가 동행인 전화번호 (up to 16 characters)',
    required: false,
    type: String,
    example: '01012345678',
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  escortPhone?: string;

  @ApiProperty({
    description: '🈳 하교 방법 (up to 32 characters)',
    required: false,
    type: String,
    example: '버스',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  homeTransit?: string;

  @ApiProperty({
    description: '🈳 하교후 가는 곳 (up to 32 characters)',
    required: false,
    type: String,
    example: '학원',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  nextStop?: string;

  @ApiProperty({
    description: '🈳 학생 상태 (enum default: ATTENDING)',
    enum: StudentStatus,
    default: StudentStatus.ATTENDING,
    required: false,
    example: StudentStatus.ATTENDING,
  })
  @IsEnum(StudentStatus)
  @IsOptional()
  status: StudentStatus = StudentStatus.ATTENDING;

  @ApiProperty({
    description: '🈳 비고 (up to 255 characters)',
    required: false,
    type: String,
    example: '비고',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;

  @ApiProperty({
    description: '🈵 보호자 정보',
    type: CreateParentDto,
    required: true,
    example: {
      name: '홍길동',
      phone: '01012345678',
    },
  })
  @ValidateNested()
  @Type(() => CreateParentDto)
  parent: CreateParentDto = {} as CreateParentDto;
}
