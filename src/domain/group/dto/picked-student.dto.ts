import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { Actor } from 'src/common/enums';
import { Student } from 'src/domain/student/entities/student.entity';

export class PickedStudentDto extends Student {
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
    description: '인덱스',
    example: 1,
  })
  @Expose()
  index: number | null;

  @ApiProperty({
    description: '부모 전화번호',
    example: '01012345678',
  })
  parentPhone: string;

  @ApiProperty({
    description: '수업 시작일',
    example: '2023-01-01',
    nullable: true,
  })
  @Expose()
  start: string | null;

  @ApiProperty({
    description: '등록자',
    example: Actor.MANAGER,
    enum: Actor,
  })
  startedBy: Actor | null;

  @ApiProperty({
    description: '수업 취소일',
    example: '2023-01-01',
    nullable: true,
  })
  @Expose()
  end: string | null;

  @ApiProperty({
    description: '등록자',
    example: Actor.MANAGER,
    enum: Actor,
  })
  endedBy: Actor | null;

  history: {
    date: string;
    event: 'JOIN' | 'CANCEL';
    by: 'MANAGER' | 'INSTRUCTOR' | 'OTHER';
  }[];

  @ApiProperty({
    description: '수업 여부',
    example: true,
  })
  isActive: boolean;

  constructor(partial: Partial<PickedStudentDto>) {
    super(partial);
    Object.assign(this, partial);
  }
}
