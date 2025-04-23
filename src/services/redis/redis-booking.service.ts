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
      local applicants_key = offering_id .. ":applicants"

      local already_applied = redis.call("ZSCORE", applicants_key, student_id)
      if already_applied then
        return "ERR_BOOKED"
      end

      redis.call("ZADD", applicants_key, timestamp, student_id)

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
          redis.call("ZREM", applicants_key, student_id)
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

  async executeCancelScript(
    offeringId: number,
    studentId: number,
  ): Promise<{ ok?: string }> {
    const script = `
      local offering_id = KEYS[1]
      local student_id = ARGV[1]

      local enrolled_key = offering_id .. ":enrolled"
      local pending_key = offering_id .. ":pending"
      local applicants_key = offering_id .. ":applicants"

      redis.call("ZREM", applicants_key, student_id)
      redis.call("LREM", enrolled_key, 0, student_id)
      redis.call("LREM", pending_key, 0, student_id)

      return "OK_CANCELED"
    `;

    const keyPrefix = this.getKey(`offering:${offeringId}`);
    const result = await this.redisClient.eval(script, {
      keys: [keyPrefix],
      arguments: [studentId.toString()],
    });

    return { ok: result === 'OK_CANCELED' ? 'CANCELED' : undefined };
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
