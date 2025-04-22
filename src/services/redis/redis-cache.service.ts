// src/services/redis/redis-cache.service.ts
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { createClient } from 'redis';
import { REDIS_CACHE_OPTIONS } from 'src/common/constants';

@Injectable()
export class RedisCacheService implements OnModuleInit {
  private readonly redisClient: ReturnType<typeof createClient>;

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
      console.error('❌ Failed to connect to Redis cache:', error);
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
    const prefixedKey = this.getPrefixedKey(key);

    if (ttl) {
      await this.redisClient.setEx(prefixedKey, ttl, serializedValue);
    } else {
      await this.redisClient.set(prefixedKey, serializedValue);
    }
  }

  // 캐시 조회
  async get<T>(key: string): Promise<T | null> {
    const prefixedKey = this.getPrefixedKey(key);
    const value = await this.redisClient.get(prefixedKey);
    return value ? (JSON.parse(value) as T) : null;
  }

  // 캐시 삭제
  async del(key: string): Promise<void> {
    const prefixedKey = this.getPrefixedKey(key);
    await this.redisClient.del(prefixedKey);
  }

  // 캐시 전체 초기화
  async flush(): Promise<void> {
    await this.redisClient.flushDb();
  }

  // 클라이언트 상태 확인
  async ping(): Promise<string> {
    return await this.redisClient.ping();
  }

  // Redis 클라이언트 반환 (필요 시 저수준 작업용)
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
