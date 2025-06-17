import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { REDIS_TRACKING_OPTIONS } from 'src/common/constants';
import { RedisBookingService } from 'src/services/redis/redis-booking.service';

interface RedisTrackingOptions {
  host: string;
  port: number;
  password?: string;
  keyPrefix?: string;
  db?: number;
}

@Injectable()
export class RedisTrackingService implements OnModuleInit {
  private readonly logger = new Logger(RedisBookingService.name);
  private redisClient: RedisClientType;

  constructor(
    @Inject(REDIS_TRACKING_OPTIONS)
    private readonly redisOptions: RedisTrackingOptions,
  ) {
    this.redisClient = createClient({
      socket: {
        host: this.redisOptions.host,
        port: this.redisOptions.port,
      },
      password: this.redisOptions.password,
      database: this.redisOptions.db,
      legacyMode: false, // 최신 방식 사용
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
        `Redis (Tracking) connected: ${this.redisOptions.host}:${this.redisOptions.port}`,
      );
    } catch (error) {
      console.error('❌ Failed to connect to Redis cache:', error);
    }
  }

  //? 학부모별 열람 상태 초기화
  async initParentReadStatus(
    keyValuePairs: Record<string, string>,
  ): Promise<void> {
    try {
      await this.redisClient.mSet(keyValuePairs);
    } catch (error) {
      console.error('❌ Redis initStudentReadStatus error:', error);
      /**
       * @Todo 보상 로직 추가 필요
       */
      // await this.clearStudentReadStatus(keyValuePairs);
      throw new InternalServerErrorException(
        error.message || 'Database operation failed',
      );
    }
  }

  //? 보상 로직: 특정 letterId에 대한 키 삭제
  async clearStudentReadStatus(letterId: number): Promise<void> {
    const keys = await this.redisClient.keys(`letter:${letterId}:student:*`);
    if (keys.length > 0) {
      await this.redisClient.del(keys);
    }
  }

  async ping(): Promise<string> {
    return await this.redisClient.ping();
  }

  getClient(): RedisClientType {
    return this.redisClient;
  }
}
