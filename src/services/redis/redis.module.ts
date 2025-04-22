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
} from 'src/common/constants';
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
    // Booking options provider
    {
      provide: REDIS_BOOKING_OPTIONS,
      useFactory: (configService: ConfigService) => ({
        host: configService.get<string>('redis.host', 'localhost'),
        port: configService.get<number>('redis.port', 6379),
        password: configService.get<string>('redis.password', ''),
        db: configService.get<number>('redis.bookingDb', 1),
        keyPrefix: 'booking:',
      }),
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
    // Message options provider
    {
      provide: REDIS_MESSAGE_OPTIONS,
      useFactory: (configService: ConfigService) => ({
        host: configService.get<string>('redis.host', 'localhost'),
        port: configService.get<number>('redis.port', 6379),
        password: configService.get<string>('redis.password', ''),
        db: configService.get<number>('redis.messageDb', 2),
        keyPrefix: 'message:',
      }),
      inject: [ConfigService],
    },
    // Service providers
    RedisBookingService,
    RedisCacheService,
    RedisMessageService,
    // Booking service provider
    {
      provide: REDIS_BOOKING_CLIENT,
      useExisting: RedisBookingService,
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
    REDIS_CACHE_CLIENT,
    REDIS_MESSAGE_CLIENT,
    RedisBookingService,
    RedisCacheService,
    RedisMessageService,
  ],
})
export class RedisModule {}
