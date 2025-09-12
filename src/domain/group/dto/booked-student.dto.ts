import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus, StudentStatus } from 'src/common/enums';

export class BookedStudentDto {
  @ApiProperty({
    description: 'booking ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: '학생 ID',
    example: 1,
  })
  studentId: number;

  @ApiProperty({
    description: '그룹 ID',
    example: 1,
  })
  groupId: number;

  @ApiProperty({
    description: '그룹 이름',
    example: '배드민턴A',
  })
  groupName: string;

  @ApiProperty({
    description: '학생 이름',
    example: '홍길동',
  })
  name: string;

  @ApiProperty({
    description: '학년',
    example: 2,
  })
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
    description: '대기 순번',
    example: 1,
    minimum: 1,
    maximum: 50,
  })
  waitingPosition: number;

  @ApiProperty({
    description: '예약 상태',
    example: BookingStatus.PENDING,
    enum: BookingStatus,
  })
  bookingStatus: BookingStatus;

  constructor(partial: Partial<BookedStudentDto>) {
    Object.assign(this, partial);
  }
}
