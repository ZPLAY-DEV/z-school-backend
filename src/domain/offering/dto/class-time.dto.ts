import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { Weekday } from 'src/common/enums';

export class ClassTimeDto {
  @ApiProperty({ enum: Weekday })
  @IsEnum(Weekday)
  weekday: Weekday;

  @ApiProperty({ example: '15:00' })
  @IsString()
  start: string;

  @ApiProperty({ example: '23:00' })
  @IsString()
  end: string;
}
