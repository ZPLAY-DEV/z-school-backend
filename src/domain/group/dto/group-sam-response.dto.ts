import { ApiProperty } from '@nestjs/swagger';
import { GroupResponseDto } from './group-response.dto';
import { SamInstructorResponseDto } from 'src/domain/sam/dto/sam-instructor-response.dto';

export class GroupSamResponseDto extends GroupResponseDto {
  @ApiProperty({
    description: '강사 정보',
    type: SamInstructorResponseDto,
  })
  sam: SamInstructorResponseDto;
}
