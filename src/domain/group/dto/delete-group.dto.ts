import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Actor } from 'src/common/enums';

export class DeleteGroupDto {
  @ApiPropertyOptional({ description: 'Action 사유/특이사항/정보' })
  @IsString()
  note: string;

  @ApiPropertyOptional({ description: 'actor role' })
  @IsOptional()
  @IsEnum(Actor)
  role?: Actor;
}
