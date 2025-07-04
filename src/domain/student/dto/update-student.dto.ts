import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreateStudentDto } from 'src/domain/student/dto/create-student.dto';

class UpdateParentDto {
  @ApiProperty({
    description: '🈳 학부모 이름',
    example: '홍길동',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: '🈳 전화번호 (숫자만)',
    example: '01012345678',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: '🈳 내용',
    example: '비고',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;
}

// parent 필드를 제외하고 나머지만 Partial로 만들기
export class UpdateStudentDto extends PartialType(
  class {
    parentId: CreateStudentDto['parentId'];
    schoolId: CreateStudentDto['schoolId'];
    grade: CreateStudentDto['grade'];
    class: CreateStudentDto['class'];
    studentCode: CreateStudentDto['studentCode'];
    name: CreateStudentDto['name'];
    phone: CreateStudentDto['phone'];
    escortPhone: CreateStudentDto['escortPhone'];
    homeTransit: CreateStudentDto['homeTransit'];
    nextStop: CreateStudentDto['nextStop'];
    status: CreateStudentDto['status'];
    note: CreateStudentDto['note'];
  },
) {
  @ApiProperty({
    description: '🈳 보호자 정보 (부분 수정)',
    type: UpdateParentDto,
    required: false,
  })
  @ValidateNested()
  @IsOptional()
  @Type(() => UpdateParentDto)
  parent?: UpdateParentDto;
}
