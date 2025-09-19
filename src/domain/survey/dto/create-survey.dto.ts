import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateSurveyDto {
  @ApiProperty({ description: '지원금 금액', example: 100000 })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  amount: number;

  @ApiProperty({ description: '지원금 지급주체', example: '교육부' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsString()
  start: string;

  @IsString()
  end: string;

  @ApiProperty({ description: '비고', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
