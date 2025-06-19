import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  REDIS_BOOKING_CLIENT,
  REDIS_CACHE_CLIENT,
  REDIS_TRACKING_CLIENT,
} from 'src/common/constants';
import { RedisBookingService } from 'src/services/redis/redis-booking.service';
import { RedisCacheService } from 'src/services/redis/redis-cache.service';
import { RedisTrackingService } from 'src/services/redis/redis-tracking.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @Inject(REDIS_BOOKING_CLIENT)
    private readonly redisBookingService: RedisBookingService,
    @Inject(REDIS_TRACKING_CLIENT)
    private readonly redisTrackingService: RedisTrackingService,
    @Inject(REDIS_CACHE_CLIENT)
    private readonly redisCacheService: RedisCacheService,
  ) {}

  getVersion(): string {
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
      version: string;
    };
    return packageJson.version;
  }

  async purgeBookings(): Promise<number> {
    try {
      const redisClient = this.redisBookingService.getClient();
      const keys = await redisClient.keys('offering:*');
      if (keys.length > 0) {
        await redisClient.del(keys);
        return keys.length;
      }
      return 0;
    } catch (error) {
      this.logger.error('❌ Redis booking 데이터 삭제 실패', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  async purgeTracking(): Promise<number> {
    try {
      const redisClient = this.redisTrackingService.getClient();
      const keys = await redisClient.keys('tracking:*');
      if (keys.length > 0) {
        await redisClient.del(keys);
        return keys.length;
      }
      return 0;
    } catch (error) {
      this.logger.error('❌ Redis booking 데이터 삭제 실패', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  async purgeCache(): Promise<number> {
    try {
      const redisClient = this.redisCacheService.getClient();
      await redisClient.flushDb();
      return 1;
    } catch (error) {
      this.logger.error('❌ Redis cache 데이터 삭제 실패', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }
}
