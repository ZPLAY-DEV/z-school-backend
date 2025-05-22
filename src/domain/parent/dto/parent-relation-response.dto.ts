import { ApiProperty } from '@nestjs/swagger';
import { ParentResponseDto } from './parent-response.dto';
import { StudentResponseDto } from 'src/domain/student/dto/student-response.dto';

export class ParentRelationResponseDto extends ParentResponseDto {
  @ApiProperty({
    description: '학부모의 자식 정보',
    type: StudentResponseDto,
  })
  students: StudentResponseDto[];
}
