import { ApiProperty } from '@nestjs/swagger';
import { SamResponseDto } from './sam-response.dto';
import { InstructorResponseDto } from 'src/domain/instructor/dto/instructor-response.dto';

export class CreateSamResponseDto extends SamResponseDto {
  @ApiProperty({
    description: '메인 강사 정보',
    example: {
      id: 1,
      userId: 1,
      name: '홍길동',
      phone: '01012345678',
      note: '아줌마',
      registeredDocuments: null,
      termsAgreedAt: null,
      createdAt: '2021-01-01',
      updatedAt: '2021-01-01',
    },
    type: InstructorResponseDto,
  })
  instructor: InstructorResponseDto;
}
