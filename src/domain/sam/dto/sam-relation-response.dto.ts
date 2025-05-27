import { ApiProperty } from '@nestjs/swagger';
import { SamResponseDto } from './sam-response.dto';
import { InstructorResponseDto } from 'src/domain/instructor/dto/instructor-response.dto';
import { GroupResponseDto } from 'src/domain/group/dto/group-response.dto';
import { DocumentResponseDto } from 'src/domain/document/dto/document-response.dto';

export class SamRelationResponseDto extends SamResponseDto {
  @ApiProperty({
    description: '메인 강사 정보',
    type: InstructorResponseDto,
  })
  instructor: InstructorResponseDto;

  @ApiProperty({
    description: '수강중인 group(반) 목록',
    type: GroupResponseDto,
    isArray: true,
  })
  groups: GroupResponseDto[];

  @ApiProperty({
    description: '문서 목록',
    type: DocumentResponseDto,
    isArray: true,
  })
  documents: DocumentResponseDto[];
}
