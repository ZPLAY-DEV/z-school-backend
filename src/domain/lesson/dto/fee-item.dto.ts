import { IsNumber } from '@nestjs/class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsString, MaxLength } from 'class-validator';

export class FeeItemDto {
  @ApiProperty({ description: '항목명' })
  @IsString()
  @MaxLength(16)
  name: string;

  @ApiProperty({ description: '금액' })
  @IsNumber()
  @IsInt()
  @IsPositive()
  amount: number;
}
