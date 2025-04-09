import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { SubsidyStatus, SubsidyType } from 'src/common/enums';

export class CreateSubsidyDto {
  @ApiProperty({ description: 'Student ID', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  studentId?: number;

  @ApiProperty({ description: '지원금 금액', example: 100000 })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  amount: number;

  @ApiProperty({ description: '지원금 지급주체', example: '교육부' })
  @IsNotEmpty()
  @IsString()
  source: string;

  @ApiProperty({
    description: '지원금 프로그램',
    enum: SubsidyType,
    default: SubsidyType.BASIC_EDUCATION_RECIPIENT,
  })
  @IsEnum(SubsidyType)
  @IsOptional()
  type?: SubsidyType = SubsidyType.BASIC_EDUCATION_RECIPIENT;

  @ApiProperty({
    description: '지원금 프로그램',
    enum: SubsidyStatus,
    default: SubsidyStatus.PENDING,
  })
  @IsEnum(SubsidyStatus)
  @IsOptional()
  status?: SubsidyStatus = SubsidyStatus.PENDING;

  @ApiProperty({ description: '비고', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
