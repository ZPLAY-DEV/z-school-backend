import { ApiProperty } from '@nestjs/swagger';
import { GroupResponseDto } from 'src/domain/group/dto/group-response.dto';
import { InstructorResponseDto } from 'src/domain/instructor/dto/instructor-response.dto';
import { SamResponseDto } from './sam-response.dto';

export class SamRelationResponseDto extends SamResponseDto {
  @ApiProperty({
    description: '메인 강사 정보',
    type: InstructorResponseDto,
  })
  instructor: InstructorResponseDto;

  @ApiProperty({
    description: '강의중인 group(반) 목록',
    type: GroupResponseDto,
    isArray: true,
  })
  groups: GroupResponseDto[];
}
