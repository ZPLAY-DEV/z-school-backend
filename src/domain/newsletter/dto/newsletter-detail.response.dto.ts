import { ApiProperty } from '@nestjs/swagger';
import { StudentNotificationInfo } from 'src/common/interfaces';
import { Newsletter } from '../entities/newsletter.entity';

export class NewsletterDetailResponseDto extends Newsletter {
  @ApiProperty({
    description: '관련 학생 정보 (수강신청 타입일 때만)',
    type: [Object],
    example: [
      {
        id: 1,
        name: '홍길동',
        grade: 1,
        class: '1반',
        studentCode: 12,
        read: true,
      },
    ],
    required: false,
  })
  students?: StudentNotificationInfo[];

  @ApiProperty({
    description: '총 학생 수 (수강신청 타입일 때만)',
    required: false,
    example: 10,
  })
  total?: number;

  constructor(
    newsletter: Newsletter,
    students?: StudentNotificationInfo[],
    total?: number,
  ) {
    super(newsletter);
    if (students) {
      this.students = students;
    }
    if (total !== undefined) {
      this.total = total;
    }
  }
}
