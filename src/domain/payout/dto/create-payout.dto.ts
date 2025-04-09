import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { LedgerType } from 'src/common/enums';

export class CreatePayoutDto {
  @ApiProperty({ description: '🈵 Instructor ID', example: 1 })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  instructorId: number;

  @ApiProperty({ description: '🈵 Lesson ID', example: 1 })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  lessonId: number;

  @ApiPropertyOptional({
    description: '🈳 Description',
    example: 'Payment for January lessons',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string | null;

  @ApiProperty({ description: '🈵 Amount', example: 50000 })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    description: '🈵 Ledger type',
    enum: LedgerType,
    default: LedgerType.CREDIT,
    example: LedgerType.CREDIT,
  })
  @IsEnum(LedgerType)
  type: LedgerType = LedgerType.CREDIT;

  @ApiProperty({ description: '🈵 Balance', example: 50000 })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  balance: number;

  @ApiProperty({
    description: '🈳 Breakdown of the amount',
    required: false,
    example: { book: 1000, material: 2000, etc: 3000 },
  })
  @IsOptional()
  @IsObject()
  breakdown?: Record<string, number> | null;

  @ApiPropertyOptional({ description: '🈳 Notification date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  notifiedAt?: Date | null;
}
