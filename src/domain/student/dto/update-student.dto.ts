import { OmitType, PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, ValidateNested } from 'class-validator';
import { UpdateParentDto } from 'src/domain/parent/dto/update-parent.dto';
import { CreateStudentDto } from 'src/domain/student/dto/create-student.dto';

export class UpdateStudentDto extends PartialType(
  OmitType(CreateStudentDto, ['parent'] as const),
) {
  @ApiProperty({
    description: '🈵 보호자 정보 (수정시 필수)',
    type: UpdateParentDto,
    required: true,
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => UpdateParentDto)
  parent: UpdateParentDto;
}
