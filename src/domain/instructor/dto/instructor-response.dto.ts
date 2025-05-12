import { ApiProperty } from '@nestjs/swagger';
import { InstructorSchoolResponseDto } from './instructor-school-response.dto';
import { GroupResponseDto } from 'src/domain/group/dto/group-response.dto';

export class InstructorResponseDto {
  @ApiProperty({ description: 'id', example: 1, type: Number })
  id: number;
  @ApiProperty({ description: '강사의 userId', example: 1, type: Number })
  userId: number | null;
  @ApiProperty({ description: '강사 이름', example: '홍길동', type: String })
  name: string;
  @ApiProperty({
    description: '강사 전화 번호',
    example: '01012345678',
    type: String,
  })
  phone: string;
  @ApiProperty({
    description: '강사 점수 ( 0~100  )',
    example: 5,
    type: Number,
  })
  score: number;
  @ApiProperty({
    description: '등록된 문서 리스트',
    example: '[이력서, 경력증명서 ..]',
    type: String,
  })
  registeredDocuments: DocumentType[] | null;
  @ApiProperty({
    description: '약관동의 시간',
    example: '2025-05-08T02:27:20.321Z',
    type: String,
  })
  termsAgreedAt: Date | null;
  @ApiProperty({ description: '생성 시간', example: new Date(), type: Date })
  createdAt: Date;
  @ApiProperty({ description: '수정 시간', example: new Date(), type: Date })
  updatedAt: Date;

  @ApiProperty({
    description: '강사의 학교 정보',
    type: InstructorSchoolResponseDto,
  })
  instructorSchools: InstructorSchoolResponseDto;

  @ApiProperty({
    description: '강사의 그룹 정보',
    type: GroupResponseDto,
    isArray: true,
  })
  groups: GroupResponseDto[];
}
