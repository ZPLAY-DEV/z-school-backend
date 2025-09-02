import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { Actor, StudentStatus } from 'src/common/enums';

export class PickedStudentDto {
  @ApiProperty({
    description: '학생 ID',
    example: 1,
  })
  @Expose()
  id: number;

  @ApiProperty({
    description: '그룹 ID',
    example: 1,
  })
  @Expose()
  groupId: number;

  @ApiProperty({
    description: '그룹 이름',
    example: '배드민턴A',
  })
  @Expose()
  groupName: string;

  @ApiProperty({
    description: '학생 이름',
    example: '홍길동',
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: '학년',
    example: 2,
  })
  @Expose()
  grade: number;

  @ApiProperty({
    description: '반',
    example: '1반',
  })
  class: string;

  @ApiProperty({
    description: '학번/번호',
    example: 10,
  })
  studentCode: number;

  @ApiProperty({
    description: '학생 상태',
    example: StudentStatus.ATTENDING,
    enum: StudentStatus,
  })
  status: StudentStatus;

  @ApiProperty({
    description: '부모 전화번호',
    example: '01012345678',
  })
  parentPhone: string;

  @ApiProperty({
    description: '등록자',
    example: Actor.MANAGER,
    enum: Actor,
  })
  startedBy: Actor | null;

  @ApiProperty({
    description: '등록자',
    example: Actor.MANAGER,
    enum: Actor,
  })
  endedBy: Actor | null;

  @ApiProperty({
    description: '수업 시작일',
    example: '2023-01-01',
    nullable: true,
  })
  @Expose()
  start: string | null;

  @ApiProperty({
    description: '수업 취소일',
    example: '2023-01-01',
    nullable: true,
  })
  @Expose()
  end: string | null;

  @ApiProperty({
    description: '수업 여부',
    example: true,
  })
  isActive: boolean;

  constructor(partial: Partial<PickedStudentDto>) {
    Object.assign(this, partial);
  }
}
