import { ApiProperty } from '@nestjs/swagger';
import { GroupResponseDto } from './group-response.dto';
import { PickResponseDto } from 'src/domain/pick/dto/pick-response.dto';

export class GroupRelationResponseDto extends GroupResponseDto {
  @ApiProperty({
    description: '반 학생 목록',
    type: PickResponseDto,
    isArray: true,
  })
  groupStudents: PickResponseDto[];
}
