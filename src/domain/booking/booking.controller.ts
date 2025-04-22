import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { BookingResponseDto } from './dto/booking-response.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

@ApiTags('수강신청')
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '수강 신청' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '수강 신청 결과',
    type: BookingResponseDto,
  })
  async create(
    @Body() createBookingDto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookingService.create(createBookingDto);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '수강 신청 취소' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '수강 신청 취소 결과',
    type: BookingResponseDto,
  })
  async cancel(
    @Body() cancelBookingDto: CancelBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookingService.cancel(cancelBookingDto);
  }
}
