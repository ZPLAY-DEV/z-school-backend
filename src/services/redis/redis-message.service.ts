// src/services/redis/redis-message.service.ts
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { createClient } from 'redis';
import { lastValueFrom } from 'rxjs';
import { REDIS_MESSAGE_OPTIONS } from 'src/common/constants';

interface RedisMessageOptions {
  host: string;
  port: number;
  password?: string;
  keyPrefix?: string;
  db?: number;
  retryStrategy?: (times: number) => number;
}
@Injectable()
export class RedisMessageService implements OnModuleInit {
  private readonly logger = new Logger(RedisMessageService.name);
  private readonly redisClient: ReturnType<typeof createClient>; // Pub/Sub용 클라이언트
  private readonly redisSubClient: ReturnType<typeof createClient>; // 구독 전용 클라이언트
  private readonly redisMessageClient: ClientProxy; // Microservice 클라이언트

  constructor(
    @Inject(REDIS_MESSAGE_OPTIONS)
    private readonly redisOptions: RedisMessageOptions,
  ) {
    // 발행용 클라이언트
    this.redisClient = createClient({
      socket: {
        host: this.redisOptions.host,
        port: this.redisOptions.port,
      },
      password: this.redisOptions.password,
      database: this.redisOptions.db,
    });
    // Connect to the publisher client
    this.redisClient.connect().catch((error) => {
      console.error('❌ Failed to connect to Redis publisher client:', error);
    });

    // 구독용 클라이언트 (별도 연결)
    this.redisSubClient = createClient({
      socket: {
        host: this.redisOptions.host,
        port: this.redisOptions.port,
      },
      password: this.redisOptions.password,
      database: this.redisOptions.db,
    });
    // Connect to the subscriber client
    this.redisSubClient.connect().catch((error) => {
      console.error('❌ Failed to connect to Redis subscriber client:', error);
    });
    // Microservice 클라이언트 초기화
    this.redisMessageClient = ClientProxyFactory.create({
      transport: Transport.REDIS,
      options: {
        host: this.redisOptions.host,
        port: this.redisOptions.port,
        password: this.redisOptions.password,
      },
    });
  }

  async onModuleInit() {
    try {
      await this.pingPub();
      await this.pingSub();
      this.logger.log(
        `Redis (Messaging) connected: ${this.redisOptions.host}:${this.redisOptions.port}`,
      );
    } catch (error) {
      console.error('❌ Failed to connect to Redis message service:', error);
    }
  }

  // 메시지 발행 (Pub/Sub)
  async publish(channel: string, message: any): Promise<void> {
    const prefixedChannel = this.getPrefixedKey(channel);
    const serializedMessage = JSON.stringify(message);
    await this.redisClient.publish(prefixedChannel, serializedMessage);
  }

  // 메시지 구독 (Pub/Sub)
  async subscribe(
    channel: string,
    callback: (message: any) => void,
  ): Promise<void> {
    const prefixedChannel = this.getPrefixedKey(channel);

    // In redis v4, we need to use the subscribe method and set up message handlers differently
    await this.redisSubClient.subscribe(prefixedChannel, (message) => {
      try {
        callback(JSON.parse(message));
      } catch (error) {
        console.error('Failed to parse Redis pub/sub message:', error);
      }
    });
  }

  // 구독 해제
  async unsubscribe(channel: string): Promise<void> {
    const prefixedChannel = this.getPrefixedKey(channel);
    await this.redisSubClient.unsubscribe(prefixedChannel);
  }

  // Microservice 패턴으로 이벤트 발행
  async emitEvent(pattern: string, data: any): Promise<void> {
    await lastValueFrom(this.redisMessageClient.emit(pattern, data));
  }

  // Microservice 패턴으로 메시지 전송 (응답 기대)
  async sendMessage<T>(pattern: string, data: any): Promise<T> {
    return (await lastValueFrom(
      this.redisMessageClient.send(pattern, data),
    )) as T;
  }

  getMessageClient(): ClientProxy {
    return this.redisMessageClient;
  }

  getPubClient(): ReturnType<typeof createClient> {
    return this.redisClient;
  }
  getSubClient(): ReturnType<typeof createClient> {
    return this.redisSubClient;
  }

  async pingPub(): Promise<string> {
    return await this.redisClient.ping();
  }

  async pingSub(): Promise<string> {
    return await this.redisSubClient.ping();
  }

  // Add key prefix manually
  private getPrefixedKey(key: string): string {
    return this.redisOptions.keyPrefix
      ? `${this.redisOptions.keyPrefix}${key}`
      : key;
  }
}
