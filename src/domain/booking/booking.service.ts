import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BookingStatus } from 'src/common/enums';
import { SqsService } from 'src/services/aws/sqs.service';
import { RedisBookingService } from 'src/services/redis/redis-booking.service';
import { Repository } from 'typeorm';
import { Offering } from '../offering/entities/offering.entity';
import { BookingResponseDto } from './dto/booking-response.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Booking } from './entities/booking.entity';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Offering)
    private readonly offeringRepository: Repository<Offering>,
    private readonly redisBookingService: RedisBookingService,
    private readonly sqsService: SqsService,
  ) {}

  async create(dto: CreateBookingDto): Promise<BookingResponseDto> {
    const { offeringId, studentId, capacity, isFormerStudent = false } = dto;
    const timestamp = Date.now();

    try {
      // Execute Redis Lua script for atomic booking
      const result = await this.redisBookingService.executeBookingScript(
        offeringId,
        studentId,
        timestamp,
        capacity,
      );

      console.log(`🟢🟢`, result);

      let response: BookingResponseDto;

      if (result.ok === 'ENROLLED') {
        response = new BookingResponseDto({ status: BookingStatus.ENROLLED });
      } else if (result.ok === 'PENDING') {
        const waitingPosition =
          await this.redisBookingService.getWaitingPosition(
            offeringId,
            studentId,
          );
        response = new BookingResponseDto({
          status: BookingStatus.PENDING,
          waitingPosition,
        });
      } else if (result.err === 'BOOKED') {
        return new BookingResponseDto({
          status: BookingStatus.BOOKED,
        });
      } else if (result.err === 'FULL') {
        return new BookingResponseDto({ status: BookingStatus.FULL });
      } else {
        return new BookingResponseDto({
          status: BookingStatus.ERROR,
          message: 'Unknown error occurred',
        });
      }

      // Send message to SQS for async processing
      await this.sqsService.sendMessage({
        offeringId,
        studentId,
        timestamp,
        status: response.status,
        waitingPosition: response.waitingPosition,
        isFormerStudent,
      });

      return response;
    } catch (error) {
      this.logger.error(
        `Failed to create booking: ${error.message}`,
        error.stack,
      );
      return new BookingResponseDto({
        status: BookingStatus.ERROR,
        message: 'Failed to process booking',
      });
    }
  }

  async cancel(
    cancelBookingDto: CancelBookingDto,
  ): Promise<BookingResponseDto> {
    const { offeringId, studentId } = cancelBookingDto;

    try {
      // Execute Redis Lua script for cancellation
      const result = await this.redisBookingService.executeCancelScript(
        offeringId,
        studentId,
      );

      if (result.ok === 'CANCELED') {
        // Send message to SQS for async processing (DB update, notification, etc.)
        await this.sqsService.sendMessage({
          offeringId,
          studentId,
          timestamp: Date.now(),
          status: BookingStatus.CANCELED,
        });

        return new BookingResponseDto({ status: BookingStatus.CANCELED });
      } else {
        return new BookingResponseDto({
          status: BookingStatus.ERROR,
          message: 'Failed to cancel booking',
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to cancel booking: ${error.message}`,
        error.stack,
      );
      return new BookingResponseDto({
        status: BookingStatus.ERROR,
        message: 'Failed to process cancellation',
      });
    }
  }
}
