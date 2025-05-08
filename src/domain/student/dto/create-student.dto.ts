import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { StudentStatus } from 'src/common/enums';
import { CreateParentDto } from 'src/domain/parent/dto/create-parent.dto';

export class CreateStudentDto {
  @ApiProperty({ description: 'Parent ID (number)', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  parentId: number;

  @ApiProperty({ description: 'School ID (number)', required: true })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  schoolId: number;

  @ApiProperty({
    description: '학년 (up to 8 characters)',
    required: true,
  })
  @IsString()
  @MaxLength(8)
  grade: string;

  @ApiProperty({
    description: '반 (up to 8 characters)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  class?: string;

  @ApiProperty({
    description: '학번/번호 ( number )',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  studentCode?: number;

  @ApiProperty({
    description: '학생 이름 (up to 16 characters)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  name?: string;

  @ApiProperty({
    description: '학생 전화번호 (up to 16 characters)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  phone?: string;

  @ApiProperty({
    description: '귀가 동행인 전화번호 (up to 16 characters)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  escortPhone?: string;

  @ApiProperty({
    description: '하교 방벙 (up to 32 characters)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  homeTransit?: string;

  @ApiProperty({
    description: '하교후 가는 곳 (up to 32 characters)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  nextStop?: string;

  @ApiProperty({
    description: '학생 상태 (enum default: ATTENDING)',
    enum: StudentStatus,
    default: StudentStatus.ATTENDING,
    required: false,
  })
  @IsEnum(StudentStatus)
  status: StudentStatus = StudentStatus.ATTENDING;

  @ApiProperty({ description: '비고 (up to 255 characters)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;

  @ApiProperty({ description: '보호자 정보', required: true })
  @ValidateNested()
  @Type(() => CreateParentDto)
  parent: CreateParentDto = {} as CreateParentDto;
}
