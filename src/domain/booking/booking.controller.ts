import { Body, Controller, Delete, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HttpResponse } from 'src/core/http/http-response';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { ResponseBookingDto } from 'src/domain/booking/dto/response-booking.dto';
import {
  CancelWithDbSwagger,
  CancelWithRedisSwagger,
  CreateWithDbSwagger,
  CreateWithRedisSwagger,
} from 'src/domain/booking/swagger/rest-swagger.decorator';
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

  @Post('db')
  @CreateWithDbSwagger()
  async createWithDb(
    @Body() dto: CreateBookingDto,
  ): Promise<ResponseBookingDto> {
    return await this.bookingService.createWithDb(dto);
  }

  @Post('redis')
  @CreateWithRedisSwagger()
  async createWithRedis(@Body() dto: CreateBookingDto): Promise<HttpResponse> {
    const result = await this.bookingService.createWithRedis(dto);
    return HttpResponse.created(result);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Cancel Booking (수강신청 취소)
  //? ---------------------------------------------------------------------- ?//

  @Delete('db')
  @CancelWithDbSwagger()
  async cancelWithDb(@Body() dto: CancelBookingDto): Promise<HttpResponse> {
    await this.bookingService.cancelWithDb(dto);
    return HttpResponse.ok();
  }

  @Delete('redis')
  @CancelWithRedisSwagger()
  async cancelWithRedis(@Body() dto: CancelBookingDto): Promise<HttpResponse> {
    await this.bookingService.cancelWithRedis(dto);
    return HttpResponse.ok();
  }
}
