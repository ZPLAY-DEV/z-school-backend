import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor!: ReturnType<typeof createAdapter>;
  private readonly configService: ConfigService;
  private readonly logger = new Logger(RedisIoAdapter.name);

  constructor(app: INestApplication) {
    super(app);
    this.configService = app.get(ConfigService);
  }

  async connectToRedis(): Promise<void> {
    const redisHost = this.configService.get<string>('redis.host');
    const redisPort = this.configService.get<number>('redis.port');

    const pubClient = createClient({
      socket: { host: redisHost, port: redisPort },
    });
    const subClient = pubClient.duplicate();

    try {
      await Promise.all([pubClient.connect(), subClient.connect()]);
      this.adapterConstructor = createAdapter(pubClient, subClient);

      this.logger.log(
        `Redis connected successfully: host=${redisHost}, port=${redisPort}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to connect to Redis: host=${redisHost}, port=${redisPort}`,
        error.stack,
      );
      throw new Error('Redis connection failed');
    }
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);

    if (!this.adapterConstructor) {
      this.logger.error(
        'Redis adapter is not initialized. Call connectToRedis first.',
      );
      throw new Error('Redis adapter is not initialized');
    }

    server.adapter(this.adapterConstructor);
    this.logger.log(`Socket.IO server created on port ${port}`);
    return server;
  }
}
