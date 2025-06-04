import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional } from 'class-validator';
import { Actor } from 'src/common/enums';
import { CreateSchooldayDto } from 'src/domain/schoolday/dto/create-schoolday.dto';

export class UpdateSchooldayDto extends PartialType(CreateSchooldayDto) {}

export class UpdateSchooldayTimeDto {
  @ApiProperty({ description: '시작시각 (DateTime)' })
  @Type(() => Date)
  @IsDate()
  startsAt: Date;

  @ApiProperty({ description: '종료시각 (DateTime)' })
  @Type(() => Date)
  @IsDate()
  endsAt: Date;

  @ApiPropertyOptional({ description: 'actor role' })
  @IsOptional()
  @IsEnum(Actor)
  role?: Actor;
}
