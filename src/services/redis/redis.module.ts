import KeyvRedis from '@keyv/redis';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  KEYV_REDIS,
  REDIS_BOOKING_CLIENT,
  REDIS_BOOKING_OPTIONS,
  REDIS_CACHE_CLIENT,
  REDIS_CACHE_OPTIONS,
} from 'src/common/constants';
import { RedisBookingService } from 'src/services/redis/redis-booking.service';
import { RedisCacheService } from 'src/services/redis/redis-cache.service';

@Module({
  providers: [
    // KEYV_REDIS provider for cache operations
    {
      provide: KEYV_REDIS,
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('redis.host', 'localhost');
        const port = configService.get<number>('redis.port', 6379);
        const url = `redis://${host}:${port}`;

        return new KeyvRedis(url);
      },
      inject: [ConfigService],
    },
    // Cache options provider
    {
      provide: REDIS_CACHE_OPTIONS,
      useFactory: (configService: ConfigService) => ({
        host: configService.get<string>('redis.host', 'localhost'),
        port: configService.get<number>('redis.port', 6379),
        password: configService.get<string>('redis.password', ''),
        // prod 가 아닌 환경의 경우에만 db 0 지정
        ...(configService.get<string>('nodeEnv') !== 'prod' && {
          db: 0,
        }),
        keyPrefix: 'cache:',
      }),
      inject: [ConfigService],
    },
    // Booking options provider
    {
      provide: REDIS_BOOKING_OPTIONS,
      useFactory: (configService: ConfigService) => ({
        host: configService.get<string>('redisBooking.host', 'localhost'),
        port: configService.get<number>('redisBooking.port', 6379),
        password: configService.get<string>('redisBooking.password', ''),
        // prod 가 아닌 환경의 경우에만 db 1 지정
        ...(configService.get<string>('nodeEnv') !== 'prod' && {
          db: 1,
        }),
      }),
      inject: [ConfigService],
    },
    // Tracking options provider
    // {
    //   provide: REDIS_TRACKING_OPTIONS,
    //   useFactory: (configService: ConfigService) => ({
    //     host: configService.get<string>('redis.host', 'localhost'),
    //     port: configService.get<number>('redis.port', 6379),
    //     password: configService.get<string>('redis.password', ''),
    //     db: configService.get<number>('redis.dispatchDb', 2),
    //   }),
    //   inject: [ConfigService],
    // },
    RedisCacheService,
    RedisBookingService,
    // RedisTrackingService,
    // RedisMessageService,
    {
      provide: REDIS_CACHE_CLIENT,
      useExisting: RedisCacheService,
    },
    {
      provide: REDIS_BOOKING_CLIENT,
      useExisting: RedisBookingService,
    },
    // {
    //   provide: REDIS_TRACKING_CLIENT,
    //   useExisting: RedisTrackingService,
    // },
    // {
    //   provide: REDIS_MESSAGE_CLIENT,
    //   useExisting: RedisMessageService,
    // },
  ],
  exports: [
    KEYV_REDIS,
    REDIS_CACHE_CLIENT,
    REDIS_BOOKING_CLIENT,
    // REDIS_TRACKING_CLIENT,
    // REDIS_MESSAGE_CLIENT,
    RedisCacheService,
    RedisBookingService,
    // RedisTrackingService,
    // RedisMessageService,
  ],
})
export class RedisModule {}
