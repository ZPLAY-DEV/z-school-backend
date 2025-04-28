import { ApiProperty } from '@nestjs/swagger';

export class TermResponseDto {
  @ApiProperty({ description: ' DB의 학기ID', type: Number })
  id: number;

  @ApiProperty({ description: ' DB의 학교ID', type: Number })
  schoolId: number;

  @ApiProperty({ description: ' 학교명', type: String })
  schoolName: string;

  @ApiProperty({ description: ' 학사년도', type: Number })
  schoolYear: number;

  @ApiProperty({ description: ' 학기명', type: String })
  termName: string;

  @ApiProperty({
    description: ' ISO 형식의 날짜 문자열 (YYYY-MM-DD)',
    type: String,
  })
  start: string;

  @ApiProperty({
    description: ' ISO 형식의 날짜 문자열 (YYYY-MM-DD)',
    type: String,
  })
  end: string;

  @ApiProperty({ description: '생성된 시기 ', type: Date })
  createdAt: Date;

  constructor(data: Partial<TermResponseDto>) {
    Object.assign(this, data);
  }
}
