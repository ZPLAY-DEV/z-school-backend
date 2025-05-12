import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeleteInstructorSchoolDto {
  @ApiProperty({
    description: '삭제 사유',
    example: '강사 계약 종료',
    required: false,
    type: String,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note: string;
}
