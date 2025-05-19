import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { BookingStatus } from 'src/common/enums';

export class ResponseBookingDto {
  @ApiProperty({ description: 'Status of the booking', enum: BookingStatus })
  status: BookingStatus;

  @ApiProperty({
    description: '대기순번',
    example: 1,
  })
  @IsOptional()
  waitingPosition?: number;

  @ApiProperty({ description: 'message if any' })
  message: string;

  constructor(partial: Partial<ResponseBookingDto>) {
    Object.assign(this, partial);
  }
}

// db
// - status: PENDING
// - waitingPosition: undefined
// - message: "xxx 수강신청 했습니다. (신청기간이후 종료후 결과발표예정)"

// redis
// - status: ENROLLED
// - waitingPosition: undefined
// - message: "수강신청결과 xxx 수강이 확정되었습니다."
//
// - status: PENDING
// - waitingPosition: 2
// - message: "수강신청결과 xxx 수강이 대기상태입니다. (대기 2번)"
//
// - status: FULL
// - waitingPosition: -1
// - message: "수강신청결과 xxx 수강이 불가합니다."

// ok
// - ENROLLED
// - PENDING
// - FULL
//
// err
// - BOOKED
// - UNKNOWN
