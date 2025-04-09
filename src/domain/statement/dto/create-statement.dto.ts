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

export class CreateStatementDto {
  @ApiProperty({
    description: 'School ID',
    type: Number,
    example: 1,
  })
  @IsInt()
  @IsPositive()
  schoolId: number;

  @ApiPropertyOptional({
    description: 'Statement description',
    maxLength: 255,
    example: 'Monthly tuition payment',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string | null;

  @ApiProperty({
    description: 'Amount',
    type: Number,
    example: 50000,
  })
  @IsInt()
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: 'Ledger type',
    enum: LedgerType,
    example: LedgerType.CREDIT,
    default: LedgerType.CREDIT,
  })
  @IsEnum(LedgerType)
  type: LedgerType = LedgerType.CREDIT;

  @ApiProperty({
    description: 'Balance',
    type: Number,
    example: 150000,
    default: 0,
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
    description: 'Notification date',
    type: Date,
    example: '2023-01-01T00:00:00Z',
  })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  notifiedAt?: Date | null;
}
