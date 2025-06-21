import { Body, Controller, Delete, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PickRule } from 'src/common/enums';

import { ResponseBookingDto } from 'src/domain/booking/dto/response-booking.dto';
import {
  CancelBookingSwagger,
  CreateBookingSwagger,
} from 'src/domain/booking/swagger/booking-swagger.decorator';
import { BookingService } from './booking.service';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

@ApiTags('✅ Bookings ( 수강신청 )')
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create Booking (수강신청)
  //? ---------------------------------------------------------------------- ?//

  @Post()
  @CreateBookingSwagger()
  async create(@Body() dto: CreateBookingDto): Promise<ResponseBookingDto> {
    if (dto.pickRule === PickRule.FIRST) {
      return await this.bookingService.createWithRedis(dto);
    } else {
      return await this.bookingService.createWithDb(dto);
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Cancel Booking (수강신청 취소)
  //? ---------------------------------------------------------------------- ?//

  @Delete()
  @CancelBookingSwagger()
  async cancel(@Body() dto: CancelBookingDto): Promise<number> {
    if (dto.pickRule === PickRule.FIRST) {
      return await this.bookingService.cancelWithRedis(dto);
    } else {
      return await this.bookingService.cancelWithDb(dto);
    }
  }
}
