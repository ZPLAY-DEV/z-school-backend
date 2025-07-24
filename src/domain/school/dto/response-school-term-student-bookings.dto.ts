import { ApiProperty } from '@nestjs/swagger';
import { Weekday } from 'src/common/enums';
import { Booking } from 'src/domain/booking/entities/booking.entity';

export class ResponseSchoolTermStudentBookingsDto {
  @ApiProperty({
    description: '수업 요일',
    enum: Weekday,
    example: Weekday.MONDAY,
  })
  weekday: Weekday;

  @ApiProperty({ description: '해당 요일의 booking 목록', type: [Booking] })
  bookings: Booking[];

  constructor(weekday: Weekday, bookings: Booking[]) {
    this.weekday = weekday;
    this.bookings = bookings;
  }
}
