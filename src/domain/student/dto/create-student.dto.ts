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
  @ApiProperty({ description: 'Parent ID', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  parentId: number;

  @ApiProperty({ description: 'School ID', required: true })
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
    description: '학번/번호 (up to 16 characters)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  studentCode?: string;

  @ApiProperty({
    description: 'Student name (up to 16 characters)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  name?: string;

  @ApiProperty({
    description: 'Phone number (up to 16 characters)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  phone?: string;

  @ApiProperty({
    description: 'Escort phone number (up to 16 characters)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  escortPhone?: string;

  @ApiProperty({
    description: 'Home transit (up to 32 characters)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  homeTransit?: string;

  @ApiProperty({
    description: 'Next stop (up to 32 characters)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  nextStop?: string;

  @ApiProperty({
    description: 'Student status',
    enum: StudentStatus,
    default: StudentStatus.ATTENDING,
  })
  @IsEnum(StudentStatus)
  status: StudentStatus = StudentStatus.ATTENDING;

  @ApiProperty({ description: 'Note (up to 255 characters)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;

  @ApiProperty({ description: 'Parent information', required: true })
  @ValidateNested()
  @Type(() => CreateParentDto)
  parent: CreateParentDto = {} as CreateParentDto;
}
