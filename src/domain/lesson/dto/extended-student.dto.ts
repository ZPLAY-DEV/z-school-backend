import { ApiProperty } from '@nestjs/swagger';
import { Student } from 'src/domain/student/entities/student.entity';

export interface ExtendedStudent extends Student {
  groupName: string;
  pickStart: string;
}

export class ExtendedStudentDto {
  @ApiProperty({ description: 'studentId', example: 1 })
  id: number;

  @ApiProperty({ description: 'parentId' })
  parentId: number;

  @ApiProperty({ description: 'schoolId' })
  schoolId: number;

  @ApiProperty({ description: '학년' })
  grade: number;

  @ApiProperty({ description: '반' })
  class: string;

  @ApiProperty({ description: '학번/번호' })
  studentCode: number;

  @ApiProperty({ description: '이름' })
  name: string;

  @ApiProperty({ description: '전화번호' })
  phone: string | null;

  @ApiProperty({ description: '귀가 동행인 전화번호' })
  escortPhone: string | null;

  @ApiProperty({ description: '하교방법' })
  homeTransit: string | null;

  @ApiProperty({ description: '하교후 목적지' })
  nextStop: string | null;

  @ApiProperty({ description: '학생의 상태' })
  status: string;

  @ApiProperty({ description: '비고' })
  note: string | null;

  @ApiProperty({ description: 'createdAt' })
  createdAt: Date;

  @ApiProperty({ description: 'updatedAt' })
  updatedAt: Date;

  @ApiProperty({ description: '반 이름' })
  groupName: string;

  @ApiProperty({ description: '수업 시작일' })
  pickStart: string;

  // Parent 관계
  parent?: any;
}
