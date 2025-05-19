import { Body, Controller, Delete, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EnrollmentRule } from 'src/common/enums';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { ResponseBookingDto } from 'src/domain/booking/dto/response-booking.dto';
import {
  CancelBookingSwagger,
  CreateBookingSwagger,
} from 'src/domain/booking/swagger/booking-swagger.decorator';
import { BookingService } from './booking.service';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

@ApiTags('✅ Booking ( 수강신청 )')
@ApiCommonErrorResponseTemplate()
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create Booking (수강신청)
  //? ---------------------------------------------------------------------- ?//

  @Post()
  @CreateBookingSwagger()
  async create(@Body() dto: CreateBookingDto): Promise<ResponseBookingDto> {
    if (dto.enrollmentRule === EnrollmentRule.FIRST) {
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
    if (dto.enrollmentRule === EnrollmentRule.FIRST) {
      return await this.bookingService.cancelWithRedis(dto);
    } else {
      return await this.bookingService.cancelWithDb(dto);
    }
  }
}
