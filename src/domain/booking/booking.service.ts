import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BookingStatus } from 'src/common/enums';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { SqsService } from 'src/services/aws/sqs.service';
import { RedisBookingService } from 'src/services/redis/redis-booking.service';
import { Repository } from 'typeorm';
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
    private readonly redisBookingService: RedisBookingService,
    private readonly sqsService: SqsService,
  ) {}

  async createWithDb(dto: CreateBookingDto): Promise<Booking> {
    const { offeringId, studentId, isFormerStudent } = dto;

    try {
      const booking = await this.bookingRepository.save(
        this.bookingRepository.create({
          offeringId,
          studentId,
          isFormerStudent,
        }),
      );

      return booking;
    } catch (error) {
      this.logger.error(
        `Failed to create booking: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        HttpErrorConstants.INTERNAL_DATABASE_ERROR,
      );
    }
  }

  async createWithRedis(dto: CreateBookingDto): Promise<BookingResponseDto> {
    const { offeringId, studentId, capacity, isFormerStudent } = dto;
    const timestamp = Date.now();

    try {
      // Execute Redis Lua script for atomic booking
      const result = await this.redisBookingService.executeBookingScript(
        offeringId,
        studentId,
        timestamp,
        capacity,
      );

      if (result.ok) {
        let response: BookingResponseDto;
        if (result.ok === 'ENROLLED') {
          response = new BookingResponseDto({
            status: BookingStatus.ENROLLED,
            message: '수강신청 결과 수강이 확정되었습니다.',
          });
        } else {
          const waitingPosition =
            await this.redisBookingService.getWaitingPosition(
              offeringId,
              studentId,
            );
          response = new BookingResponseDto({
            status: BookingStatus.PENDING,
            waitingPosition,
            message: `수강신청 결과 대기순서 ${waitingPosition}번 입니다.`,
          });
        }

        // Send message to SQS for async processing
        await this.sqsService.sendMessage({
          event: 'CREATE_BOOKING',
          payload: {
            offeringId,
            studentId,
            timestamp,
            status: response.status,
            waitingPosition: response.waitingPosition,
            isFormerStudent,
          },
        });

        return response;
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      this.logger.error(
        `Failed to create booking: ${error.message}`,
        error.stack,
      );
      if (error instanceof Error && error.message === 'BOOKED') {
        throw new UnprocessableEntityException(
          HttpErrorConstants.ALREADY_BOOKED,
        );
      }
      if (error instanceof Error && error.message === 'FULL') {
        throw new UnprocessableEntityException(
          HttpErrorConstants.NOT_AVAILABLE,
        );
      }
      throw new InternalServerErrorException(
        HttpErrorConstants.INTERNAL_DATABASE_ERROR,
      );
    }
  }

  async cancelWithDb(cancelBookingDto: CancelBookingDto): Promise<void> {
    const { offeringId, studentId } = cancelBookingDto;

    try {
      await this.bookingRepository.softRemove({
        offeringId,
        studentId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to cancel booking: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        HttpErrorConstants.INTERNAL_DATABASE_ERROR,
      );
    }
  }

  // todo. 굳이 queue 를 사용해야 하나? 고민.
  async cancelWithRedis(cancelBookingDto: CancelBookingDto): Promise<void> {
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
          event: 'DELETE_BOOKING',
          payload: {
            offeringId,
            studentId,
          },
        });
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      this.logger.error(
        `Failed to cancel booking: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        HttpErrorConstants.INTERNAL_DATABASE_ERROR,
      );
    }
  }
}
