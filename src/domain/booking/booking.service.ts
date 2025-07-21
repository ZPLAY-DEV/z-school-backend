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
import { BookingStatus, ClassStatus, PickRule } from 'src/common/enums';
import { IBookingSnapshotItem } from 'src/common/interfaces';
import { CreateLateBookingDto } from 'src/domain/booking/dto/create-late-booking.dto';
import { Offering } from 'src/domain/offering/entities/offering.entity';
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
    @InjectRepository(Offering)
    private readonly offeringRepository: Repository<Offering>,
    @Inject(AWS_SQS_CLIENT)
    private readonly sqsClient: SqsService,
    @Inject(REDIS_BOOKING_CLIENT)
    private readonly redisBookingService: RedisBookingService,
  ) {}

  //? ---------------------------------------------------------------------- ?//

  async createLateBooking(
    dto: CreateLateBookingDto,
  ): Promise<ResponseBookingDto> {
    await this.validateOfferingStatus(dto.offeringId);

    // 가장 마지막 waitingPostition 조회
    const lastWaitingPosition = await this.bookingRepository.findOne({
      where: { offeringId: dto.offeringId },
      order: { waitingPosition: 'DESC' },
    });

    const note = '기간외 수강신청';
    const waitingPosition = (lastWaitingPosition?.waitingPosition || 0) + 1;
    const status = BookingStatus.PENDING;
    const message = `🟡 수강신청결과 ${dto.lessonName} 수강이 대기상태입니다. (대기 ${waitingPosition}번)`;

    const booking = this.bookingRepository.create({
      ...dto,
      status,
      waitingPosition,
      note,
    });
    await this.bookingRepository.save(booking);

    return new ResponseBookingDto({
      status,
      waitingPosition,
      message,
    });
  }

  //? ---------------------------------------------------------------------- ?//

  async createWithDb(dto: CreateBookingDto): Promise<ResponseBookingDto> {
    try {
      let status: BookingStatus;
      let waitingPosition: number;
      let message: string;

      await this.validateOfferingStatus(dto.offeringId);

      if (dto.pickRule === PickRule.ANYONE) {
        // 누구나
        status = BookingStatus.ENROLLED;
        waitingPosition = 0;
        message = `🟢 수강신청결과 ${dto.lessonName} 수강이 확정되었습니다.`;
        const booking = this.bookingRepository.create({
          ...dto,
          status,
          waitingPosition,
        });
        await this.bookingRepository.save(booking);
        await this.offeringRepository.increment(
          { id: dto.offeringId },
          'bookingCount',
          1,
        );
      } else {
        // 무작위
        status = BookingStatus.PENDING;
        waitingPosition = 0;
        message = `🔵 ${dto.lessonName} 수강신청 했습니다. (신청기간이후 결과발표예정)`;
        const booking = this.bookingRepository.create({
          ...dto,
          status,
          waitingPosition,
        });
        await this.bookingRepository.save(booking);
        await this.offeringRepository.increment(
          { id: dto.offeringId },
          'bookingCount',
          1,
        );
      }

      return new ResponseBookingDto({
        status,
        waitingPosition,
        message,
      });
    } catch (error) {
      if (
        error.code === 'ER_DUP_ENTRY' ||
        error.code === '23505' ||
        error.code === 1062
      ) {
        throw new UnprocessableEntityException(
          '이미 수강신청이 접수되었습니다.',
        );
      }
      this.logger.error(`❌ Booking 실패`, error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  async cancelWithDb(dto: CancelBookingDto): Promise<number> {
    const { offeringId, studentId } = dto;

    await this.validateOfferingStatus(offeringId);

    try {
      const { affected } = await this.bookingRepository.update(
        { offeringId, studentId },
        { status: BookingStatus.CANCELED },
      );
      await this.decrementBookingCountSafely(offeringId);
      return affected as number; // Assuming 1 row is affected
    } catch (error) {
      this.logger.error(`❌ Booking 취소 실패`, error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  //? ---------------------------------------------------------------------- ?//

  async createWithRedis(dto: CreateBookingDto): Promise<ResponseBookingDto> {
    const { offeringId, studentId, lessonName, capacity, pickRule } = dto;
    const timestamp = Date.now();

    await this.validateOfferingStatus(offeringId);

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
        // not fire and forget. need to wait for the result from sqs.
        await this.sqsClient.sendMessage({
          type: 'CREATE_BOOKING',
          data: {
            offeringId,
            studentId,
            lessonName,
            capacity,
            pickRule, // basically, this is going to be "선착순"
            waitingPosition: response.waitingPosition ?? 0,
            status: response.status,
            timestamp,
          } as CreateBookingDto, // bookings 저장용 data 를 sqs 로 전송
        });
        await this.offeringRepository.increment(
          { id: dto.offeringId },
          'bookingCount',
          1,
        );

        return response;
      } else {
        throw result.err === 'BOOKED' ? new Error('BOOKED') : new Error();
      }
    } catch (error) {
      this.logger.error(`❌ Booking 실패`, error.stack);
      if (error instanceof Error && error.message === 'BOOKED') {
        throw new UnprocessableEntityException(
          '이미 수강신청이 접수되었습니다.',
        );
      }

      if (error instanceof Error && error.message.includes('SQS')) {
        this.logger.error(`❌ SQS 메시지 전송 실패`, error.stack);
        throw new InternalServerErrorException(error.message);
      }

      throw new InternalServerErrorException(error.message);
    }
  }

  //? my goal: upsert entire data in one go with snapshot for idempotency.
  async cancelWithRedis(dto: CancelBookingDto): Promise<number> {
    const { offeringId, studentId, lessonName } = dto;
    const timestamp = Date.now();

    await this.validateOfferingStatus(offeringId);

    try {
      const result = await this.redisBookingService.executeCancelScript(
        offeringId,
        dto.studentId,
      );

      if (result.ok) {
        // snapshot 생성 (RedisBookingService에서)
        const snapshot: IBookingSnapshotItem[] =
          await this.redisBookingService.getSnapshot(offeringId, lessonName);

        // this.logger.log('🚀 snapshot', snapshot);
        // not fire and forget. need to wait for the result from sqs.
        await this.sqsClient.sendMessage({
          type: 'CANCEL_BOOKING',
          data: {
            offeringId,
            studentId,
            timestamp,
            snapshot,
          },
        });
        await this.decrementBookingCountSafely(offeringId);

        return snapshot.length;
      } else {
        throw result.err === 'NOT_FOUND' ? new Error('NOT_FOUND') : new Error();
      }
    } catch (error) {
      this.logger.error(`❌ Booking 취소 실패`, error.stack);

      if (error instanceof Error && error.message === 'NOT_FOUND') {
        throw new NotFoundException(
          `Booking not found for offering ${offeringId} and student ${studentId}`,
        );
      }
      throw new InternalServerErrorException(error.message);
    }
  }

  // ------------------------------------------------------------------------ //
  // private methods
  // ------------------------------------------------------------------------ //

  private async decrementBookingCountSafely(offeringId: number): Promise<void> {
    await this.offeringRepository.query(
      'UPDATE offerings SET bookingCount = bookingCount - 1 WHERE id = ? AND bookingCount > 0',
      [offeringId],
    );
  }

  async validateOfferingStatus(offeringId: number): Promise<void> {
    const offering = await this.offeringRepository.findOne({
      where: { id: offeringId },
    });

    if (!offering) {
      throw new NotFoundException('수강신청과목을 찾을 수 없습니다.');
    }

    if (offering.status === ClassStatus.CANCELED) {
      throw new UnprocessableEntityException('삭제된 수강신청과목 입니다.');
    }
  }
}
