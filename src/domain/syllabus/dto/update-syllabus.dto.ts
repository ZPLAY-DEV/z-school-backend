import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, ValidateNested } from 'class-validator';
import { CreateProgramDto } from 'src/domain/program/dto/create-program.dto';
import { CreateWeekDto } from 'src/domain/week/dto/create-week.dto';
import { CreateSyllabusDto } from './create-syllabus.dto';

class UpdateProgramWithIdDto extends PartialType(CreateProgramDto) {
  @ApiProperty({
    description: '🈳 program ID (업데이트 시 필요)',
    required: false,
  })
  @IsInt()
  @IsOptional()
  id?: number;
}

class UpdateWeekWithProgramsDto extends PartialType(CreateWeekDto) {
  @ApiProperty({
    description: '🈳 week ID (업데이트 시 필요)',
    required: false,
  })
  @IsInt()
  @IsOptional()
  id?: number;

  @ApiProperty({
    description: '🈳 programs',
    type: [UpdateProgramWithIdDto],
    required: false,
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateProgramWithIdDto)
  programs?: UpdateProgramWithIdDto[];
}

export class UpdateSyllabusDto extends PartialType(CreateSyllabusDto) {
  @ApiProperty({
    description: '🈳 weeks (nested with programs)',
    type: [UpdateWeekWithProgramsDto],
    required: false,
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateWeekWithProgramsDto)
  weeks?: UpdateWeekWithProgramsDto[];
}
