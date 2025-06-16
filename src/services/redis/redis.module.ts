import KeyvRedis from '@keyv/redis';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  KEYV_REDIS,
  REDIS_BOOKING_CLIENT,
  REDIS_BOOKING_OPTIONS,
  REDIS_CACHE_CLIENT,
  REDIS_CACHE_OPTIONS,
  REDIS_MESSAGE_CLIENT,
  REDIS_MESSAGE_OPTIONS,
  REDIS_TRACKING_CLIENT,
  REDIS_TRACKING_OPTIONS,
} from 'src/common/constants';
import { RedisTrackingService } from 'src/services/redis/redis-tracking.service';
import { RedisBookingService } from './redis-booking.service';
import { RedisCacheService } from './redis-cache.service';
import { RedisMessageService } from './redis-message.service';

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
        db: configService.get<number>('redis.cacheDb', 0),
        keyPrefix: 'cache:',
      }),
      inject: [ConfigService],
    },
    // Booking options provider
    {
      provide: REDIS_BOOKING_OPTIONS,
      useFactory: (configService: ConfigService) => ({
        host: configService.get<string>('redis.host', 'localhost'),
        port: configService.get<number>('redis.port', 6379),
        password: configService.get<string>('redis.password', ''),
        db: configService.get<number>('redis.bookingDb', 1),
      }),
      inject: [ConfigService],
    },
    // Tracking options provider
    {
      provide: REDIS_TRACKING_OPTIONS,
      useFactory: (configService: ConfigService) => ({
        host: configService.get<string>('redis.host', 'localhost'),
        port: configService.get<number>('redis.port', 6379),
        password: configService.get<string>('redis.password', ''),
        db: configService.get<number>('redis.dispatchDb', 2),
      }),
      inject: [ConfigService],
    },
    // Messaging options provider
    {
      provide: REDIS_MESSAGE_OPTIONS,
      useFactory: (configService: ConfigService) => ({
        host: configService.get<string>('redis.host', 'localhost'),
        port: configService.get<number>('redis.port', 6379),
        password: configService.get<string>('redis.password', ''),
        db: configService.get<number>('redis.messageDb', 3),
        keyPrefix: 'message:',
      }),
      inject: [ConfigService],
    },
    // Service providers
    RedisBookingService,
    RedisCacheService,
    RedisMessageService,
    RedisTrackingService,
    // Cache options provider
    {
      provide: REDIS_BOOKING_CLIENT,
      useExisting: RedisBookingService,
    },
    // Dispatch client provider
    {
      provide: REDIS_TRACKING_CLIENT,
      useExisting: RedisTrackingService,
    },
    // Cache client provider
    {
      provide: REDIS_CACHE_CLIENT,
      useExisting: RedisCacheService,
    },
    // Message client provider
    {
      provide: REDIS_MESSAGE_CLIENT,
      useExisting: RedisMessageService,
    },
  ],
  exports: [
    KEYV_REDIS,
    REDIS_BOOKING_CLIENT,
    REDIS_TRACKING_CLIENT,
    REDIS_CACHE_CLIENT,
    REDIS_MESSAGE_CLIENT,
    RedisBookingService,
    RedisTrackingService,
    RedisCacheService,
    RedisMessageService,
  ],
})
export class RedisModule {}
