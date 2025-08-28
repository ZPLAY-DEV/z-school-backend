import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsInt, IsOptional } from 'class-validator';

export class CreateRegistrationNewsletterDto {
  @ApiProperty({ description: '🈵 schoolId', type: Number, example: 1 })
  @IsInt()
  schoolId: number;

  @ApiProperty({ description: '🈵 termId', type: Number, example: 1 })
  @IsInt()
  termId: number;

  @ApiProperty({ description: '🈵 첨부 파일 URL', type: [String] })
  @IsArray()
  images: string[];

  @ApiProperty({
    description: 'Date when the ledger entry was notified',
    type: Date,
    example: '2023-01-01T00:00:00Z',
  })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  date?: Date | null;
}
