import KeyvRedis from '@keyv/redis';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Module({
  providers: [
    {
      provide: 'KEYV_REDIS',
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('redis.host', 'localhost');
        const port = configService.get<number>('redis.port', 6379);
        const url = `redis://${host}:${port}`;

        return new KeyvRedis(url);
      },
      inject: [ConfigService],
    },
  ],
  exports: ['KEYV_REDIS'],
})
export class RedisModule {}
