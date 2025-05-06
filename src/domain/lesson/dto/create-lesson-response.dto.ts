import { ApiProperty } from '@nestjs/swagger';
import { Category } from 'src/domain/category/entities/category.entity';
import { Group } from 'src/domain/group/entities/group.entity';

export class CreateLessonResponseDto {
  @ApiProperty({ description: '🈵 수업의 고유 DB ID', example: 1 })
  id: number;

  @ApiProperty({ description: '🈵 학기 ID', example: 1 })
  termId: number;

  @ApiProperty({ description: '🈵 학교 ID', example: 1 })
  schoolId: number;

  @ApiProperty({ description: '🈵 학교 이름', example: '삼척초등학교' })
  schoolName: string;

  @ApiProperty({ description: '🈵 수업 이름', example: '마인드 크래프트' })
  lessonName: string;

  @ApiProperty({
    description: '🈵 수업 설명',
    example: '마인드 크래프트 장인을 만드는 수업',
  })
  description: string;

  @ApiProperty({ description: '🈵 학기별 수업 횟수', example: 0 })
  termlyLessonCount: number;

  @ApiProperty({ description: '🈵 주간 수업 횟수', example: 0 })
  weeklyLessonCount: number;

  @ApiProperty({ description: '🈵 수업 시작 날짜', example: '2025-03-01' })
  start: string;

  @ApiProperty({ description: '🈵 수업 종료 날짜', example: '2025-07-31' })
  end: string;

  @ApiProperty({ description: '🈵 총 비용', example: 0 })
  total: number;

  @ApiProperty({ description: '🈵 강사 비용', example: 30000 })
  instructorFee: number;

  @ApiProperty({
    description: '🈵 교재비 목록',
    example: [
      { name: '1급', amount: 12000 },
      { name: '2급', amount: 14000 },
    ],
    type: [Object],
  })
  bookFees: { name: string; amount: number }[];

  @ApiProperty({
    description: '🈵 재료비 목록',
    example: [
      { name: '16GB USB', amount: 15000 },
      { name: '32GB USB', amount: 26000 },
    ],
    type: [Object],
  })
  materialFees: { name: string; amount: number }[];

  @ApiProperty({ description: '🈵 운영비', example: 0 })
  operationFee: number;

  @ApiProperty({ description: '🈵 운영비 규칙', example: 'CO-1000' })
  operationFeeRule: string;

  @ApiProperty({ description: '🈳 시간 중복 허용 여부', example: false })
  allowTimeOverlap: boolean;

  @ApiProperty({ description: '🈵 등록 규칙', example: '선착순' })
  enrollmentRule: string;

  @ApiProperty({ description: '🈳 요구 서류 목록', example: [] })
  requiredDocuments: string[];

  @ApiProperty({ description: '🈵 비고', example: '블라블라' })
  note: string;

  @ApiProperty({
    description: '🈵 생성 시간',
    example: '2025-05-06T03:21:11.930Z',
  })
  createdAt: string;

  @ApiProperty({
    description: '🈵 수정 시간',
    example: '2025-05-06T03:21:11.930Z',
  })
  updatedAt: string;

  @ApiProperty({
    description: '🈳 삭제 시간',
    example: null,
    nullable: true,
  })
  deletedAt: string | null;

  @ApiProperty({
    description: '🈵 그룹 목록',
    type: [Group],
  })
  groups: Group[];

  @ApiProperty({
    description: '🈵 카테고리 목록',
    type: [Category],
  })
  categories: Category[];
}
