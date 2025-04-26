import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AWS_SQS_CLIENT, REDIS_BOOKING_CLIENT } from 'src/common/constants';
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
    @Inject(AWS_SQS_CLIENT)
    private readonly sqsClient: SqsService,
    @Inject(REDIS_BOOKING_CLIENT)
    private readonly redisBookingService: RedisBookingService,
  ) {}

  async createWithDb(dto: CreateBookingDto): Promise<Booking> {
    const { offeringId, studentId, lessonName, isFormerStudent } = dto;

    try {
      const booking = await this.bookingRepository.save(
        this.bookingRepository.create({
          offeringId,
          studentId,
          lessonName,
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
    const { offeringId, studentId, lessonName, capacity, isFormerStudent } =
      dto;
    const timestamp = Date.now();

    console.log(
      '🚀 Redis booking payload',
      offeringId,
      studentId,
      timestamp,
      capacity,
    );

    try {
      // Execute Redis Lua script for atomic booking
      const result = await this.redisBookingService.executeBookingScript(
        offeringId,
        studentId,
        timestamp,
        capacity,
      );

      console.log('🚀 Redis booking result:', result);

      let response: BookingResponseDto;
      if (result.ok) {
        if (result.ok === 'ENROLLED') {
          response = new BookingResponseDto({
            status: BookingStatus.ENROLLED,
            waitingPosition: null,
            message: `수강신청결과 ${lessonName} 수강이 확정되었습니다.`,
          });
        } else if (result.ok === 'PENDING') {
          const waitingPosition =
            await this.redisBookingService.getWaitingPosition(
              offeringId,
              studentId,
            );
          response = new BookingResponseDto({
            status: BookingStatus.PENDING,
            waitingPosition,
            message: `수강결과 ${lessonName} 대기 ${waitingPosition}번 입니다.`,
          });
        } else {
          // ☠️ result.ok === 'FULL'
          response = new BookingResponseDto({
            status: BookingStatus.PENDING, // ☠️ 대기도 불가능한 사람도 상태는 PENDING
            waitingPosition: 666, // ☠️ 대기도 불가능한 사람한테 부여하는 불길한 숫자
            message: `수강신청이 완전히 마감되었습니다.`,
          });
        }
        // 💥 fire and forget. to not block the main thread
        this.sqsClient
          .sendMessage({
            type: 'CREATE_BOOKING',
            data: {
              offeringId,
              studentId,
              lessonName,
              timestamp,
              waitingPosition: response.waitingPosition ?? null,
              isFormerStudent: isFormerStudent ?? false,
              isEnrolled: response.status === BookingStatus.ENROLLED,
            },
          })
          .catch((e) => {
            this.logger.error('🔴 SQS 전송 실패', e.stack);
            // 옵션: 실패 시 재시도 큐 혹은 로그 남기기
          });

        return response;
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      this.logger.error(
        `🔴 Failed to create booking: ${error.message}`,
        error.stack,
      );
      if (error instanceof Error && error.message === 'BOOKED') {
        throw new UnprocessableEntityException(
          HttpErrorConstants.ALREADY_BOOKED,
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
        `🔴 Failed to cancel booking: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        HttpErrorConstants.INTERNAL_DATABASE_ERROR,
      );
    }
  }

  // todo. queue 를 사용해야 하는지 고민해 볼 것.
  async cancelWithRedis(cancelBookingDto: CancelBookingDto): Promise<void> {
    const { offeringId, studentId, lessonName } = cancelBookingDto;

    try {
      // Execute Redis Lua script for cancellation
      const result = await this.redisBookingService.executeCancelScript(
        offeringId,
        studentId,
      );

      if (result.ok === 'CANCELED') {
        // Send message to SQS for async processing (DB update, notification, etc.)
        await this.sqsClient.sendMessage({
          type: 'CANCEL_BOOKING',
          data: {
            offeringId,
            studentId,
            lessonName,
          },
        });
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      this.logger.error(
        `🔴 Failed to cancel booking: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        HttpErrorConstants.INTERNAL_DATABASE_ERROR,
      );
    }
  }
}
