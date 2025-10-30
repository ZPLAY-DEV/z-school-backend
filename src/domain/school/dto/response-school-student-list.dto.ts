import { ApiProperty } from '@nestjs/swagger';
import { StudentStatus } from 'src/common/enums';

export class ResponseSchoolStudentListDto {
  @ApiProperty({ description: '학생 ID' })
  id: number;

  @ApiProperty({ description: '학년' })
  grade: number;

  @ApiProperty({ description: '반' })
  klass: string;

  @ApiProperty({ description: '번호' })
  bunho: number;

  @ApiProperty({ description: '학생 이름' })
  name: string;

  @ApiProperty({ description: '학생 상태', enum: StudentStatus })
  status: StudentStatus;

  @ApiProperty({ description: '학부모 전화번호', nullable: true })
  parentPhone: string | null;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;

  @ApiProperty({ description: '수정일' })
  updatedAt: Date;
}
