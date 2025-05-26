import { ApiProperty } from '@nestjs/swagger';

export class SamResponseDto {
  @ApiProperty({ description: 'id', example: 1, type: Number })
  id: number;

  @ApiProperty({ description: '강사 id', example: 1, type: Number })
  instructorId: number;

  @ApiProperty({ description: '학교 id', example: 1, type: Number })
  schoolId: number;

  @ApiProperty({
    description: '학교별 강사의 별칭',
    example: '강사1',
    type: String,
  })
  alias: string;

  @ApiProperty({ description: '강사 평가점수', example: 0, type: Number })
  score: number;

  @ApiProperty({
    description: '교재/재료비 수정 권한 여부',
    example: false,
    type: Boolean,
  })
  editFeePermission: boolean;

  @ApiProperty({
    description: '수강 추가/취소 권한 여부',
    example: false,
    type: Boolean,
  })
  editEnrollmentPermission: boolean;

  @ApiProperty({ description: '비고', example: null, type: String })
  note: string | null;

  @ApiProperty({ description: '생성일', example: new Date(), type: Date })
  createdAt: Date;

  @ApiProperty({ description: '수정일', example: new Date(), type: Date })
  updatedAt: Date;
}
