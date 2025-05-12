import { ApiProperty } from '@nestjs/swagger';

export class InstructorSchoolResponseDto {
  @ApiProperty({ description: 'id', example: 1, type: Number })
  id: number;
  @ApiProperty({ description: '강사 id', example: 1, type: Number })
  instructorId: number;
  @ApiProperty({ description: '학교 id', example: 1, type: Number })
  schoolId: number;
  @ApiProperty({
    description: '별칭 ( 학교 내 강사 구분용 )',
    example: '1-강사',
    type: String,
  })
  alias: string;
  @ApiProperty({
    description: '비고',
    example: '다른 과목도 담당할 수 있는 강사님',
    type: String,
  })
  note: string;
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
  @ApiProperty({ description: 'createdAt', example: new Date(), type: Date })
  createdAt: Date;
  @ApiProperty({ description: 'updatedAt', example: new Date(), type: Date })
  updatedAt: Date;
}
