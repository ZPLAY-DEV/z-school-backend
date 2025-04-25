import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { REDIS_BOOKING_OPTIONS } from 'src/common/constants';

interface RedisBookingOptions {
  host: string;
  port: number;
  password?: string;
  keyPrefix?: string;
  db?: number;
}

@Injectable()
export class RedisBookingService implements OnModuleInit {
  private redisClient: RedisClientType;

  constructor(
    @Inject(REDIS_BOOKING_OPTIONS)
    private readonly redisOptions: RedisBookingOptions,
  ) {}

  async onModuleInit() {
    this.redisClient = createClient({
      socket: {
        host: this.redisOptions.host,
        port: this.redisOptions.port,
      },
      password: this.redisOptions.password,
      database: this.redisOptions.db,
      legacyMode: false, // 최신 방식 사용
    });

    this.redisClient.on('error', (err) =>
      console.error('❌ Redis error:', err),
    );

    await this.redisClient.connect();
    await this.ping();
    console.log(
      `✅ Redis connected: ${this.redisOptions.host}:${this.redisOptions.port}`,
    );
  }

  private getKey(key: string): string {
    return this.redisOptions.keyPrefix
      ? `${this.redisOptions.keyPrefix}${key}`
      : key;
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
          redis.call("ZREM", all_key, student_id)
          return "ERR_FULL"
        end
      end
    `;

    const keyPrefix = this.getKey(`offering:${offeringId}`);
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

      redis.call("ZREM", all_key, student_id)
      local removed_from_enrolled = redis.call("LREM", enrolled_key, 0, student_id)
      redis.call("LREM", pending_key, 0, student_id)

      -- 만약 수강자에서 제거가 일어났고, 대기자가 존재한다면 한 명 승급
      if removed_from_enrolled > 0 then
        local next_waiting = redis.call("LPOP", pending_key)
        if next_waiting then
          redis.call("RPUSH", enrolled_key, next_waiting)
        end
      end

      return "OK_CANCELED"
    `;

    const keyPrefix = this.getKey(`offering:${offeringId}`);
    const result = await this.redisClient.eval(script, {
      keys: [keyPrefix],
      arguments: [studentId.toString()],
    });

    if (typeof result === 'string') {
      if (result.startsWith('OK_')) return { ok: result.replace('OK_', '') };
    }

    return { err: 'UNKNOWN' };
  }

  async getWaitingPosition(
    offeringId: number,
    studentId: number,
  ): Promise<number> {
    const pendingKey = this.getKey(`offering:${offeringId}:pending`);
    const list = await this.redisClient.lRange(pendingKey, 0, -1);
    const position = list.findIndex((id) => id === studentId.toString());
    return position !== -1 ? position + 1 : 0;
  }

  async ping(): Promise<string> {
    return await this.redisClient.ping();
  }

  getClient(): RedisClientType {
    return this.redisClient;
  }
}
