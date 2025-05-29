import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ClassStatus, Weekday } from 'src/common/enums';
import { CreateGroupDto } from 'src/domain/group/dto/create-group.dto';

export class UpdateGroupDto extends PartialType(CreateGroupDto) {
  @ApiPropertyOptional({
    description: '반이름',
    example: '예비1반',
  })
  @IsString()
  @IsOptional()
  groupName?: string;

  @ApiPropertyOptional({
    description: 'class size',
    example: 20,
  })
  @IsInt()
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional({
    description: '수업 요일',
    example: Weekday.MONDAY,
  })
  @IsEnum(Weekday)
  @IsOptional()
  weekday?: Weekday;

  @ApiPropertyOptional({
    description: '수업 시작 시간',
    example: '15:00',
  })
  @IsString()
  @IsOptional()
  start?: string;

  @ApiPropertyOptional({
    description: '수업 종료 시간',
    example: '15:40',
  })
  @IsString()
  @IsOptional()
  end?: string;

  @ApiPropertyOptional({
    description: '상태',
    enum: ClassStatus,
    example: ClassStatus.ACTIVE,
  })
  @IsEnum(ClassStatus)
  @IsOptional()
  status?: ClassStatus;

  @ApiPropertyOptional({
    description: '강사성명',
    example: '김선생님',
  })
  @IsString()
  @MaxLength(16)
  @IsOptional()
  instructorName?: string;
}
