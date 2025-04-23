import { Body, Controller, Delete, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BookingStatus } from 'src/common/enums';
import { HttpResponse } from 'src/core/http/http-response';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { BookingResponseDto } from 'src/domain/booking/dto/booking-response.dto';
import {
  CancelWithDbSwagger,
  CancelWithRedisSwagger,
  CreateWithDbSwagger,
  CreateWithRedisSwagger
} from 'src/domain/booking/swagger/rest-swagger.decorator';
import { BookingService } from './booking.service';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

@ApiTags('수강신청')
@ApiCommonErrorResponseTemplate()
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post('db')
  @CreateWithDbSwagger()
  async createWithDb(@Body() dto: CreateBookingDto): Promise<HttpResponse> {
    await this.bookingService.createWithDb(dto);

    return HttpResponse.created(
      new BookingResponseDto({
        status: BookingStatus.PENDING,
        message: '수강신청했거든요.',
      }),
    );
  }

  @Post('redis')
  @CreateWithRedisSwagger()
  async createWithRedis(@Body() dto: CreateBookingDto): Promise<HttpResponse> {
    const result = await this.bookingService.createWithRedis(dto);

    return HttpResponse.created(result);
  }

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
