import { ApiProperty } from '@nestjs/swagger';

export class SamResponseDto {
  @ApiProperty({
    description: 'id',
    example: '1 --- 학교에 속한 강사의 id ( sam id )',
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: '강사 id',
    example: '4 --- 학교에 속하지 않은 상위 개념의 instructor id',
    type: Number,
  })
  instructorId: number;

  @ApiProperty({
    description: '학교 id',
    example: '1 --- 학교 id',
    type: Number,
  })
  schoolId: number;

  @ApiProperty({
    description: '학교별 강사의 별칭',
    example: '아줌마 --- 학교에서 추가한 강사의 별칭(이름)',
    type: String,
  })
  alias: string;

  @ApiProperty({
    description: '강사 평가점수',
    example: '0 --- 학교에 속한 강사의 평가점수 ',
    type: Number,
  })
  score: number;

  @ApiProperty({
    description: '교재/재료비 수정 권한 여부',
    example: 'false --- 학교에 속한 강사의 교재/재료비 수정 권한 여부',
    type: Boolean,
  })
  editFeePermission: boolean;

  @ApiProperty({
    description: '수강 추가/취소 권한 여부',
    example: 'false --- 학교에 속한 강사의 수강 추가/취소 권한 여부',
    type: Boolean,
  })
  editEnrollmentPermission: boolean;

  @ApiProperty({ description: '비고', example: '비고란', type: String })
  note: string | null;

  @ApiProperty({ description: '생성일', example: new Date(), type: Date })
  createdAt: Date;

  @ApiProperty({ description: '수정일', example: new Date(), type: Date })
  updatedAt: Date;
}
