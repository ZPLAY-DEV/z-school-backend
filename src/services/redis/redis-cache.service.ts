// src/services/redis/redis-cache.service.ts
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CACHE_OPTIONS } from 'src/common/constants';

@Injectable()
export class RedisCacheService implements OnModuleInit {
  private readonly redisClient: Redis;

  constructor(
    @Inject(REDIS_CACHE_OPTIONS)
    private readonly redisOptions: {
      host: string;
      port: number;
      password?: string;
      keyPrefix?: string;
      db?: number;
    },
  ) {
    this.redisClient = new Redis({
      host: redisOptions.host,
      port: redisOptions.port,
      password: redisOptions.password,
      keyPrefix: redisOptions.keyPrefix,
      db: redisOptions.db,
    });
  }

  async onModuleInit() {
    try {
      // Verify Redis connection on module initialization
      await this.ping();
      console.log(
        `✅ Redis cache connected: ${this.redisOptions.host}:${this.redisOptions.port}`,
      );
    } catch (error) {
      console.error('❌ Failed to connect to Redis cache:', error);
    }
  }

  // 캐시 설정
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serializedValue = JSON.stringify(value);
    if (ttl) {
      await this.redisClient.setex(key, ttl, serializedValue);
    } else {
      await this.redisClient.set(key, serializedValue);
    }
  }

  // 캐시 조회
  async get<T>(key: string): Promise<T | null> {
    const value = await this.redisClient.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  // 캐시 삭제
  async del(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  // 캐시 전체 초기화
  async flush(): Promise<void> {
    await this.redisClient.flushdb();
  }

  // 클라이언트 상태 확인
  async ping(): Promise<string> {
    return await this.redisClient.ping();
  }

  // Redis 클라이언트 반환 (필요 시 저수준 작업용)
  getClient(): Redis {
    return this.redisClient;
  }
}
