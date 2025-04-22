import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { createClient } from 'redis';
import { REDIS_BOOKING_OPTIONS } from 'src/common/constants';

@Injectable()
export class RedisBookingService implements OnModuleInit {
  private readonly redisClient: ReturnType<typeof createClient>;

  constructor(
    @Inject(REDIS_BOOKING_OPTIONS)
    private readonly redisOptions: {
      host: string;
      port: number;
      password?: string;
      keyPrefix?: string;
      db?: number;
    },
  ) {
    this.redisClient = createClient({
      socket: {
        host: redisOptions.host,
        port: redisOptions.port,
      },
      password: redisOptions.password,
      database: redisOptions.db,
    });

    // Connect to Redis when service is instantiated
    this.redisClient.connect().catch((error) => {
      console.error('❌ Failed to connect to Redis booking service:', error);
    });
  }

  async onModuleInit() {
    try {
      // Verify Redis connection on module initialization
      await this.ping();
      console.log(
        `✅ Redis booking service connected: ${this.redisOptions.host}:${this.redisOptions.port}`,
      );
    } catch (error) {
      console.error('❌ Failed to connect to Redis booking service:', error);
    }
  }

  /**
   * 수강신청을 처리하는 Lua 스크립트 실행
   * @param offeringId 강좌 ID
   * @param studentId 학생 ID
   * @param timestamp 타임스탬프
   * @param capacity 정원
   * @returns 실행 결과
   */
  async executeBookingScript(
    offeringId: number, // 키
    studentId: number, // 인자1
    timestamp: number, // 인자2
    capacity: number, // 인자3
  ): Promise<{ ok?: string; err?: string }> {
    console.log(`🟢🟢`, offeringId, studentId, timestamp, capacity);
    const script = `
      -- params: offering_id, student_id, now_timestamp, capacity
      local offering_id = KEYS[1]
      local student_id = ARGV[1]
      local timestamp = tonumber(ARGV[2])
      local capacity = tonumber(ARGV[3])
      local max_pending = 50
      
      -- Redis keys
      local enrolled_key = "offering:" .. offering_id .. ":enrolled"
      local pending_key = "offering:" .. offering_id .. ":pending"
      local applicants_key = "offering:" .. offering_id .. ":applicants"
      
      -- 이미 신청한 경우 중복 방지
      local already_applied = redis.call("ZSCORE", applicants_key, student_id)
      if already_applied then
        return "ERR_BOOKED"
      end
      
      -- 전체 신청자 리스트에 등록
      redis.call("ZADD", applicants_key, timestamp, student_id)
      
      -- 현재 수강자 수 확인
      local enrolled_count = redis.call("LLEN", enrolled_key)
      
      if enrolled_count < capacity then
        -- 수강자 등록
        redis.call("RPUSH", enrolled_key, student_id)
        return "OK_ENROLLED"
      else
        -- 대기자 수 확인
        local pending_count = redis.call("LLEN", pending_key)
        if pending_count < max_pending then
          -- 대기자 등록
          redis.call("RPUSH", pending_key, student_id)
          return "OK_PENDING"
        else
          -- 대기자도 마감
          redis.call("ZREM", applicants_key, student_id)
          return "ERR_FULL"
        end
      end
    `;

    const result = await this.redisClient.eval(
      script, // Lua Script
      {
        keys: [offeringId.toString()], // 키
        arguments: [
          studentId.toString(), // 인자1
          timestamp.toString(), // 인자2
          capacity.toString(), // 인자3
        ],
      },
    );

    if (typeof result === 'string') {
      if (result.startsWith('OK_')) return { ok: result.replace('OK_', '') };
      if (result.startsWith('ERR_')) return { err: result.replace('ERR_', '') };
    }
    return { err: 'UNKNOWN' };
  }

  /**
   * 수강신청 취소를 처리하는 Lua 스크립트 실행
   * @param offeringId 강좌 ID
   * @param studentId 학생 ID
   * @returns 실행 결과
   */
  async executeCancelScript(
    offeringId: number,
    studentId: number,
  ): Promise<{ ok?: string; err?: string }> {
    const script = `
      -- params: offering_id, student_id
      local offering_id = KEYS[1]
      local student_id = ARGV[1]
      
      -- Redis keys
      local enrolled_key = "offering:" .. offering_id .. ":enrolled"
      local pending_key = "offering:" .. offering_id .. ":pending"
      local applicants_key = "offering:" .. offering_id .. ":applicants"
      
      -- 전체 신청자 리스트에서 삭제
      redis.call("ZREM", applicants_key, student_id)
      
      -- 수강자 리스트에서 삭제
      redis.call("LREM", enrolled_key, 0, student_id)
      
      -- 대기자 리스트에서 삭제
      redis.call("LREM", pending_key, 0, student_id)
      
      return {ok="CANCELED"}
    `;

    const result = await this.redisClient.eval(script, {
      keys: [offeringId.toString()],
      arguments: [studentId.toString()],
    });

    return result as { ok?: string; err?: string };
  }

  /**
   * 대기자 순번 조회
   * @param offeringId 강좌 ID
   * @param studentId 학생 ID
   * @returns 대기자 순번 (1부터 시작)
   */
  async getWaitingPosition(
    offeringId: number,
    studentId: number,
  ): Promise<number> {
    const pendingKey = this.getPrefixedKey(`offering:${offeringId}:pending`);
    const pendingList = await this.redisClient.lRange(pendingKey, 0, -1);

    const position = pendingList.findIndex((id) => Number(id) === studentId);

    return position !== -1 ? position + 1 : 0;
  }

  /**
   * Redis 연결 상태 확인
   * @returns PONG 또는 에러
   */
  async ping(): Promise<string> {
    return await this.redisClient.ping();
  }

  /**
   * Redis 클라이언트 반환 (필요 시 저수준 작업용)
   * @returns Redis 클라이언트
   */
  getClient(): ReturnType<typeof createClient> {
    return this.redisClient;
  }

  // Add key prefix manually
  private getPrefixedKey(key: string): string {
    return this.redisOptions.keyPrefix
      ? `${this.redisOptions.keyPrefix}${key}`
      : key;
  }
}
