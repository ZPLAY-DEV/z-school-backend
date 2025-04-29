import { ApiProperty } from '@nestjs/swagger';

export class TermResponseDto {
  @ApiProperty({ description: ' DB의 학기ID', type: Number, example: 6 })
  id: number;

  @ApiProperty({ description: ' DB의 학교ID', type: Number, example: 1 })
  schoolId: number;

  @ApiProperty({ description: ' 학교명', type: String, example: '학교명' })
  schoolName: string;

  @ApiProperty({ description: ' 학사년도', type: Number, example: 2025 })
  schoolYear: number;

  @ApiProperty({ description: ' 학기명', type: String, example: '학기명' })
  termName: string;

  @ApiProperty({
    description: ' ISO 형식의 날짜 문자열 (YYYY-MM-DD)',
    type: String,
    example: '2025-03-05',
  })
  start: string;

  @ApiProperty({
    description: ' ISO 형식의 날짜 문자열 (YYYY-MM-DD)',
    type: String,
    example: '2025-07-12',
  })
  end: string;

  @ApiProperty({
    description: '생성된 시기 (ISO 형식의 날짜 문자열)',
    type: Date,
    example: '2025-04-29T05:08:56.706Z',
  })
  createdAt: Date;

  constructor(data: Partial<TermResponseDto>) {
    Object.assign(this, data);
  }
}
