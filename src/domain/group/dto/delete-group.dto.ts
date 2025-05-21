import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Actor } from 'src/common/enums';

export class TraceableNoteDto {
  @ApiPropertyOptional({ description: '삭제 사유' })
  @IsString()
  note: string;

  @ApiPropertyOptional({ description: 'actor role' })
  @IsOptional()
  @IsEnum(Actor)
  role?: Actor;
}
