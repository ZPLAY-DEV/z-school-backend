import { ApiProperty } from '@nestjs/swagger';
import { SamResponseDto } from './sam-response.dto';
import { InstructorResponseDto } from 'src/domain/instructor/dto/instructor-response.dto';

export class SamInstructorResponseDto extends SamResponseDto {
  @ApiProperty({
    description: '강사 정보',
    type: InstructorResponseDto,
  })
  instructor: InstructorResponseDto;
}
