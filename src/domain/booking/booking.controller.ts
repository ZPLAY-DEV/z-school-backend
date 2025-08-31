import { Body, Controller, Delete, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PickRule } from 'src/common/enums';
import { BookingService } from 'src/domain/booking/booking.service';
import { CancelBookingDto } from 'src/domain/booking/dto/cancel-booking.dto';
import { CreateBookingDto } from 'src/domain/booking/dto/create-booking.dto';
import { CreateManualBookingDto } from 'src/domain/booking/dto/create-manual-booking.dto';
import { ResponseBookingDto } from 'src/domain/booking/dto/response-booking.dto';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import {
  CancelBookingSwagger,
  CreateBookingSwagger,
  CreateManualBookingDocs,
} from 'src/domain/booking/swagger/booking-swagger.decorator';

@ApiTags('✳️ Bookings ( 수강신청 )')
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create Booking (수강신청)
  //? ---------------------------------------------------------------------- ?//

  @CreateBookingSwagger()
  @Post()
  async create(@Body() dto: CreateBookingDto): Promise<ResponseBookingDto> {
    if (dto.pickRule === PickRule.FIRST) {
      return await this.bookingService.createWithRedis(dto);
    } else {
      return await this.bookingService.createWithDb(dto);
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Create 기간이 지난 후 Booking (수강신청) 기록 추가
  //? ---------------------------------------------------------------------- ?//

  @CreateManualBookingDocs()
  @Post('manual')
  async createManualBooking(
    @Body() dto: CreateManualBookingDto,
  ): Promise<Booking> {
    return await this.bookingService.createManualBooking(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Cancel Booking (수강신청 취소)
  //? ---------------------------------------------------------------------- ?//

  @CancelBookingSwagger()
  @Delete()
  async cancel(@Body() dto: CancelBookingDto): Promise<number> {
    if (dto.pickRule === PickRule.FIRST) {
      return await this.bookingService.cancelWithRedis(dto);
    } else {
      return await this.bookingService.cancelWithDb(dto);
    }
  }
}
