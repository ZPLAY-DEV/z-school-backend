import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from 'src/common/enums';

export class BookingResponseDto {
  @ApiProperty({ description: 'Status of the booking', enum: BookingStatus })
  status: BookingStatus;

  @ApiProperty({
    description: 'Position in the waiting list (if status is PENDING)',
    required: false,
  })
  waitingPosition?: number;

  @ApiProperty({ description: 'Error message if any', required: false })
  message?: string;

  constructor(partial: Partial<BookingResponseDto>) {
    Object.assign(this, partial);
  }
}
