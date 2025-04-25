import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from 'src/common/enums';

export class BookingResponseDto {
  @ApiProperty({ description: 'Status of the booking', enum: BookingStatus })
  status: BookingStatus;

  @ApiProperty({
    description: 'Position in the waiting list (if bookingStatus is PENDING)',
  })
  waitingPosition: number | null;

  @ApiProperty({ description: 'message if any' })
  message: string | null;

  constructor(partial: Partial<BookingResponseDto>) {
    Object.assign(this, partial);
  }
}
