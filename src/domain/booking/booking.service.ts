import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AWS_SQS_CLIENT, REDIS_BOOKING_CLIENT } from 'src/common/constants';
import { BookingStatus } from 'src/common/enums';
import { IBookingSnapshotItem } from 'src/common/interfaces';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { SqsService } from 'src/services/aws/sqs.service';
import { RedisBookingService } from 'src/services/redis/redis-booking.service';
import { Repository } from 'typeorm';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ResponseBookingDto } from './dto/response-booking.dto';
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

  async createWithDb(dto: CreateBookingDto): Promise<ResponseBookingDto> {
    try {
      await this.bookingRepository.save(this.bookingRepository.create(dto));

      return new ResponseBookingDto({
        status: BookingStatus.PENDING,
        message: `🔵 ${dto.lessonName} 수강신청 했습니다. (신청기간이후 결과발표예정)`,
      });
    } catch (error) {
      this.logger.error(`❌ Booking 실패`, error.stack);
      throw new InternalServerErrorException(
        HttpErrorConstants.INTERNAL_DATABASE_ERROR,
      );
    }
  }

  async cancelWithDb(cancelBookingDto: CancelBookingDto): Promise<number> {
    const { offeringId, studentId } = cancelBookingDto;

    try {
      await this.bookingRepository.softRemove({
        offeringId,
        studentId,
      });

      return 1;
    } catch (error) {
      this.logger.error(`❌ Booking 취소 실패`, error.stack);
      throw new InternalServerErrorException(
        HttpErrorConstants.INTERNAL_DATABASE_ERROR,
      );
    }
  }

  async createWithRedis(dto: CreateBookingDto): Promise<ResponseBookingDto> {
    const {
      offeringId,
      studentId,
      lessonName,
      capacity,
      enrollmentRule,
      isFormerStudent,
    } = dto;
    const timestamp = Date.now();

    this.logger.log(
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

      let response: ResponseBookingDto;
      if (result.ok) {
        if (result.ok === 'ENROLLED') {
          response = new ResponseBookingDto({
            status: BookingStatus.ENROLLED,
            waitingPosition: 0,
            message: `🟢 수강신청결과 ${lessonName} 수강이 확정되었습니다.`,
          });
        } else if (result.ok === 'PENDING') {
          const waitingPosition =
            await this.redisBookingService.getWaitingPosition(
              offeringId,
              studentId,
            );
          response = new ResponseBookingDto({
            status: BookingStatus.PENDING,
            waitingPosition: waitingPosition,
            message: `🟡 수강신청결과 ${lessonName} 수강이 대기상태입니다. (대기 ${waitingPosition}번)`,
          });
        } else {
          response = new ResponseBookingDto({
            status: BookingStatus.FULL,
            waitingPosition: -1,
            message: `🔴 수강신청결과 ${lessonName} 수강이 불가합니다.`,
          });
        }
        // 💥 fire and forget) to not block the main thread
        this.sqsClient
          .sendMessage({
            type: 'CREATE_BOOKING',
            data: {
              offeringId,
              studentId,
              lessonName,
              capacity,
              enrollmentRule,
              isFormerStudent: isFormerStudent ?? false,
              waitingPosition: response.waitingPosition ?? 0,
              status: response.status,
              timestamp,
            } as CreateBookingDto, // bookings 저장용 data 를 sqs 로 전송
          })
          .catch((e) => {
            this.logger.error('❌ Booking SQS 전송 실패', e.stack);
          });

        return response;
      } else {
        throw result.err === 'BOOKED' ? new Error('BOOKED') : new Error();
      }
    } catch (error) {
      this.logger.error(`❌ Booking 실패`, error.stack);
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

  //? my goal: upsert entire data in one go with snapshot for idempotency.
  async cancelWithRedis(dto: CancelBookingDto): Promise<number> {
    const { offeringId, lessonName } = dto;
    const timestamp = Date.now();

    try {
      const result = await this.redisBookingService.executeCancelScript(
        offeringId,
        dto.studentId,
      );

      if (result.ok) {
        // snapshot 생성 (RedisBookingService에서)
        const snapshot: IBookingSnapshotItem[] =
          await this.redisBookingService.getSnapshot(offeringId, lessonName);

        // SQS로 전송
        await this.sqsClient.sendMessage({
          type: 'CANCEL_BOOKING',
          data: {
            offeringId,
            studentId: dto.studentId,
            snapshot,
            timestamp,
          },
        });

        return snapshot.length;
      } else {
        throw result.err === 'NOT_FOUND' ? new Error('NOT_FOUND') : new Error();
      }
    } catch (error) {
      this.logger.error(`❌ Booking 취소 실패`, error.stack);

      if (error instanceof Error && error.message === 'NOT_FOUND') {
        throw new NotFoundException(HttpErrorConstants.NOT_FOUND_ENTITY);
      }
      throw new InternalServerErrorException(
        HttpErrorConstants.INTERNAL_DATABASE_ERROR,
      );
    }
  }
}
