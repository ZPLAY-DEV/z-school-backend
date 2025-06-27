import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Permission, Region } from 'src/common/enums';

export class CreateSchoolDto {
  @ApiProperty({
    description: '🈳 관리자 편의를 위한 학교명',
    example: '홍익대학교 사범대학 부속 초등학교',
    required: true,
    maxLength: 24,
  })
  @IsString()
  @MaxLength(24) // '홍익대학교 사범대학 부속 초등학교'
  name: string;

  @ApiProperty({
    description: '🈵 Unique school code',
    example: '212121',
    maxLength: 16,
  })
  @IsString()
  @IsNotEmpty()
  schoolCode: string;

  @ApiProperty({
    description: '🈵 Unique school code',
    example: '212121',
    maxLength: 16,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: '🈵 Unique school authority code',
    example: 'K14',
    maxLength: 16,
  })
  @IsString()
  @IsOptional()
  authorityCode?: string;

  @ApiProperty({
    description: '🈳 Region',
    example: Region.SEOUL,
    enum: Region,
    default: Region.SEOUL,
    required: false,
  })
  @IsEnum(Region)
  @IsOptional()
  region?: Region;

  @ApiProperty({
    description: '🈳 School address',
    example: '서울특별시 강남구 역삼동 123-45',
    maxLength: 64,
    required: false,
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    description:
      '🈳 Operation fee rule (CO: same cost without changes, MC/MF: calculated by ratio)',
    example: 'CO-1000',
    maxLength: 16,
    required: false,
  })
  @IsString()
  @Length(1, 16)
  @IsOptional()
  operationFeeRule?: string;

  @ApiProperty({
    description: '🈳 Payout rate percentage (0-100)',
    example: 100,
    default: 100,
    required: false,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  payoutRate?: number;

  @ApiProperty({
    description: '🈳 Allowed permissions',
    example: [Permission.ALLOW_INSTRUCTOR_ADD_STUDENT],
    required: false,
  })
  @IsArray()
  @IsEnum(Permission, { each: true })
  @IsOptional()
  permissions?: Permission[];

  @ApiProperty({
    description: '🈳 Promotional video URLs',
    example: ['https://cdn.z-school.com/xxxx'],
    required: false,
    type: [String],
  })
  @IsOptional()
  promos?: string[];

  @ApiProperty({
    description: '🈳 절약모드 여부',
    example: false,
    default: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isFrugal?: boolean;
}
