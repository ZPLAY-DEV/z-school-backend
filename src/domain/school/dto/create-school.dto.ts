import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Permission, Region } from 'src/common/enums';

export class CreateSchoolDto {
  @ApiProperty({
    description: '🈳 School name',
    required: false,
    maxLength: 32,
  })
  @IsString()
  @Length(1, 32)
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: '🈵 Unique school code',
    maxLength: 16,
  })
  @IsString()
  @Length(1, 16)
  schoolCode?: string;

  @ApiProperty({
    description: '🈵 Unique school authority code',
    maxLength: 16,
  })
  @IsString()
  @Length(1, 16)
  authorityCode?: string;

  @ApiProperty({
    description: '🈳 Region',
    enum: Region,
    default: Region.SEOUL,
  })
  @IsEnum(Region)
  @IsOptional()
  region?: Region;

  @ApiProperty({
    description: '🈳 School address',
    required: false,
    maxLength: 64,
  })
  @IsString()
  @Length(1, 64)
  @IsOptional()
  address?: string;

  // @ApiProperty({
  //   description: '🈳 Phone number',
  //   required: false,
  //   maxLength: 16,
  // })
  // @IsString()
  // @Length(1, 16)
  // @IsOptional()
  // phone?: string;

  @ApiProperty({
    description:
      '🈳 Operation fee rule (CO: same cost without changes, MC/MF: calculated by ratio)',
    default: 'CO-1000',
    maxLength: 16,
  })
  @IsString()
  @Length(1, 16)
  @IsOptional()
  operationFeeRule?: string;

  @ApiProperty({
    description: '🈳 Payout rate percentage (0-100)',
    default: 100,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  payoutRate?: number;

  @ApiProperty({
    description: '🈳 Allowed permissions',
  })
  @IsArray()
  @IsEnum(Permission, { each: true })
  @IsOptional()
  permissions?: Permission[];

  @ApiProperty({
    description: '🈳 Promotional video URLs',
    required: false,
    type: [String],
  })
  @IsOptional()
  promos?: string[];
}
