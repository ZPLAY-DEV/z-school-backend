import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreateSamDto } from 'src/domain/sam/dto/create-sam.dto';

class UpdateInstructorDto {
  @ApiProperty({
    description: '🈳 강사 전화번호 (숫자만 입력)',
    example: '01012345678',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdateSamDto extends PartialType(
  class {
    instructorId: CreateSamDto['instructorId'];
    schoolId: CreateSamDto['schoolId'];
    alias: CreateSamDto['alias'];
    score: CreateSamDto['score'];
    editFeePermission: CreateSamDto['editFeePermission'];
    editPickPermission: CreateSamDto['editPickPermission'];
    note: CreateSamDto['note'];
  },
) {
  @ApiProperty({
    description: '🈳 강사 정보 (부분 수정)',
    type: UpdateInstructorDto,
    required: false,
  })
  @ValidateNested()
  @IsOptional()
  @Type(() => UpdateInstructorDto)
  instructor?: UpdateInstructorDto;
}
