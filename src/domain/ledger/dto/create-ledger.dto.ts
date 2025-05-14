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

export class CreateLedgerDto {
  @ApiProperty({
    description: 'Student ID',
    type: Number,
    example: 1,
  })
  @IsInt()
  @IsPositive()
  studentId: number;

  @ApiProperty({
    description: 'Lesson ID',
    type: Number,
    example: 1,
  })
  @IsInt()
  @IsPositive()
  lessonId: number;

  @ApiPropertyOptional({
    description: 'Description of the ledger entry',
    type: String,
    example: 'Monthly tuition payment',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string | null;

  @ApiProperty({
    description: 'Amount of the transaction',
    type: Number,
    example: 50000,
  })
  @IsInt()
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: 'Type of ledger entry',
    enum: LedgerType,
    example: LedgerType.CREDIT,
    default: LedgerType.CREDIT,
  })
  @IsEnum(LedgerType)
  type: LedgerType;

  @ApiProperty({
    description: 'Balance after transaction',
    type: Number,
    example: 150000,
  })
  @IsInt()
  @IsPositive()
  balance: number;

  @ApiProperty({
    description: 'Breakdown of the amount',
    required: false,
    example: { book: 1000, material: 2000, etc: 3000 },
  })
  @IsOptional()
  @IsObject()
  breakdown?: Record<string, number> | null;

  @ApiPropertyOptional({
    description: 'Date when the ledger entry was notified',
    type: Date,
    example: '2023-01-01T00:00:00Z',
  })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  notifiedAt?: Date | null;
}
