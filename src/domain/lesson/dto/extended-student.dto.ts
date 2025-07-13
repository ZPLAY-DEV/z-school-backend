import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Actor } from 'src/common/enums';
import { Student } from 'src/domain/student/entities/student.entity';

export class ExtendedStudentDto extends Student {
  // picks 속성을 제외하기 위해 명시적으로 제외
  @Exclude()
  declare picks?: any;

  // Extended properties
  @ApiProperty({ description: '그룹명', example: '1학년 1반' })
  groupName: string;

  @ApiProperty({ description: '그룹 시작일', example: '2024-03-01' })
  groupStart: string;

  @ApiProperty({ description: '그룹 시작자', example: 'ADMIN' })
  groupStartedBy: Actor | null;

  constructor(partial: Partial<ExtendedStudentDto>) {
    super(partial);
    Object.assign(this, partial);
  }
}
