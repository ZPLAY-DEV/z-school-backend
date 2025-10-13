import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { REDIS_BOOKING_OPTIONS } from 'src/common/constants';
import { BookingStatus } from 'src/common/enums';
import { IBookingSnapshotItem } from 'src/common/interfaces';

interface RedisBookingOptions {
  host: string;
  port: number;
  password?: string;
  keyPrefix?: string;
  db?: number;
}

@Injectable()
export class RedisBookingService implements OnModuleInit {
  private readonly logger = new Logger(RedisBookingService.name);
  private readonly redisClient: RedisClientType;

  constructor(
    @Inject(REDIS_BOOKING_OPTIONS)
    private readonly redisOptions: RedisBookingOptions,
  ) {
    this.redisClient = createClient({
      socket: {
        host: this.redisOptions.host,
        port: this.redisOptions.port,
      },
      password: this.redisOptions.password,
      database: this.redisOptions.db,
    });
    // Connect to Redis when service is instantiated
    this.redisClient.connect().catch((error) => {
      console.error('❌ Failed to connect to Redis booking:', error);
    });
  }

  async onModuleInit() {
    try {
      await this.ping();
      this.logger.log(
        `Redis (Booking) connected: ${this.redisOptions.host}:${this.redisOptions.port}`,
      );
    } catch (error) {
      console.error('❌ Failed to connect to Redis cache:', error);
    }
  }

  //! 수강신청
  async executeBookingScript(
    offeringId: number,
    studentId: number,
    timestamp: number,
    capacity: number,
  ): Promise<{ ok?: string; err?: string }> {
    const script = `
      local offering_id = KEYS[1]
      local student_id = ARGV[1]
      local timestamp = tonumber(ARGV[2])
      local capacity = tonumber(ARGV[3])
      local max_pending = 50

      local enrolled_key = offering_id .. ":enrolled"
      local pending_key = offering_id .. ":pending"
      local all_key = offering_id .. ":all"

      local already_booked = redis.call("ZSCORE", all_key, student_id)
      if already_booked then
        return "ERR_BOOKED"
      end

      redis.call("ZADD", all_key, timestamp, student_id)

      local enrolled_count = redis.call("LLEN", enrolled_key)

      if enrolled_count < capacity then
        redis.call("RPUSH", enrolled_key, student_id)
        return "OK_ENROLLED"
      else
        local pending_count = redis.call("LLEN", pending_key)
        if pending_count < max_pending then
          redis.call("RPUSH", pending_key, student_id)
          return "OK_PENDING"
        else
          return "OK_FULL"
        end
      end
    `;

    const keyPrefix = `offering:${offeringId}`;
    const result = await this.redisClient.eval(script, {
      keys: [keyPrefix],
      arguments: [
        studentId.toString(),
        timestamp.toString(),
        capacity.toString(),
      ],
    });

    if (typeof result === 'string') {
      if (result.startsWith('OK_')) return { ok: result.replace('OK_', '') };
      if (result.startsWith('ERR_')) return { err: result.replace('ERR_', '') };
    }

    return { err: 'UNKNOWN' };
  }

  //! 취소후 대기자 승급까지 처리
  async executeCancelScript(
    offeringId: number,
    studentId: number,
  ): Promise<{ ok?: string; err?: string }> {
    const script = `
      local offering_id = KEYS[1]
      local student_id = ARGV[1]

      local enrolled_key = offering_id .. ":enrolled"
      local pending_key = offering_id .. ":pending"
      local all_key = offering_id .. ":all"

      local removed_from_all = redis.call("ZREM", all_key, student_id)
      if removed_from_all == 0 then
        return "ERR_NOT_FOUND"
      end
      local removed_from_enrolled = redis.call("LREM", enrolled_key, 0, student_id)
      redis.call("LREM", pending_key, 0, student_id)

      -- 만약 확정자에서 제거가 일어났고, 대기자가 존재한다면 한 명 승급
      if removed_from_enrolled > 0 then
        local next_waiting = redis.call("LPOP", pending_key)
        if next_waiting then
          redis.call("RPUSH", enrolled_key, next_waiting)
        end
      end

      return "OK_CANCELED"
    `;

    const keyPrefix = `offering:${offeringId}`;
    const result = await this.redisClient.eval(script, {
      keys: [keyPrefix],
      arguments: [studentId.toString()],
    });

    if (typeof result === 'string') {
      if (result.startsWith('OK_')) return { ok: result.replace('OK_', '') };
      if (result.startsWith('ERR_')) return { err: result.replace('ERR_', '') };
    }

    return { err: 'UNKNOWN' };
  }

  // 학생아이디가 대기 리스트에 없으면 -1 반환
  // 학생아이디가 대기 리스트에 있으면 대기 리스트 position + 1 을 반환 (1부터 시작)
  // 따라서, 0 이 반환 되는 경우는 없고, -1 을 던지거나 아니면, 1 이상의 값이 반환된다.
  async getWaitingPosition(
    offeringId: number,
    studentId: number,
  ): Promise<number> {
    const pendingKey = `offering:${offeringId}:pending`;
    const list = await this.redisClient.lRange(pendingKey, 0, -1);
    const position = list.findIndex((id) => id === studentId.toString());
    return position !== -1 ? position + 1 : -1;
  }

  // Cancel 시 sqs 에 전달할 snapshot 생성 로직
  async getSnapshot(
    termId: number,
    offeringId: number,
    lessonName: string,
  ): Promise<IBookingSnapshotItem[]> {
    const allKey = `offering:${offeringId}:all`;
    const enrolledKey = `offering:${offeringId}:enrolled`;
    const pendingKey = `offering:${offeringId}:pending`;

    const allStudentIds = await this.redisClient.zRange(allKey, 0, -1);
    const enrolledIds = await this.redisClient.lRange(enrolledKey, 0, -1);
    const pendingIds = await this.redisClient.lRange(pendingKey, 0, -1);

    return allStudentIds.map((id) => {
      let status: BookingStatus;
      let waitingPosition: number;

      if (enrolledIds.includes(id)) {
        status = BookingStatus.ENROLLED;
        waitingPosition = 0;
      } else if (pendingIds.includes(id)) {
        status = BookingStatus.PENDING;
        waitingPosition = pendingIds.indexOf(id) + 1;
      } else {
        status = BookingStatus.FULL;
        waitingPosition = -1;
      }

      return {
        termId,
        offeringId,
        studentId: Number(id),
        lessonName,
        status,
        waitingPosition,
      };
    });
  }

  async ping(): Promise<string> {
    return await this.redisClient.ping();
  }

  getClient(): RedisClientType {
    return this.redisClient;
  }
}
