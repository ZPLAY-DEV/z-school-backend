import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class DeleteGroupDto {
  @ApiPropertyOptional({ description: '삭제 사유' })
  @IsString()
  note: string;
}
