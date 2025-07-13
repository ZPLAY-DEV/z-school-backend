import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from 'src/common/enums';
import { Student } from 'src/domain/student/entities/student.entity';

export class BookedStudentDto extends Student {
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
    super(partial);
    Object.assign(this, partial);
  }
}
