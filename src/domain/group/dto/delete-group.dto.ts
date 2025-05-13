import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class TraceableNoteDto {
  @ApiPropertyOptional({ description: '삭제 사유' })
  @IsString()
  note: string;

  @ApiPropertyOptional({ description: 'actor role' })
  @IsOptional()
  @IsString()
  role?: string;
}
