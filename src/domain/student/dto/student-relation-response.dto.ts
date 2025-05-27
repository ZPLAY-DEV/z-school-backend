import { ApiProperty } from '@nestjs/swagger';
import { StudentResponseDto } from './student-response.dto';
import { ParentResponseDto } from 'src/domain/parent/dto/parent-response.dto';
import { GroupResponseDto } from 'src/domain/group/dto/group-response.dto';

export class StudentRelationResponseDto extends StudentResponseDto {
  @ApiProperty({ description: '학부모 정보', type: ParentResponseDto })
  parent: ParentResponseDto;

  @ApiProperty({
    description: '수강중인 강좌 정보',
    type: GroupResponseDto,
    isArray: true,
    nullable: true,
  })
  groupStudents: GroupResponseDto[];
}
