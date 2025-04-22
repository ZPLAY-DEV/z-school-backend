// src/services/redis/redis-message.service.ts
import { Inject, Injectable } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { createClient } from 'redis';
import { lastValueFrom } from 'rxjs';
import { REDIS_MESSAGE_OPTIONS } from 'src/common/constants';

@Injectable()
export class RedisMessageService {
  private readonly redisClient: ReturnType<typeof createClient>; // Pub/Sub용 클라이언트
  private readonly redisSubClient: ReturnType<typeof createClient>; // 구독 전용 클라이언트
  private readonly redisMessageClient: ClientProxy; // Microservice 클라이언트

  constructor(
    @Inject(REDIS_MESSAGE_OPTIONS)
    private readonly redisOptions: {
      host: string;
      port: number;
      password?: string;
      keyPrefix?: string;
      db?: number;
      retryStrategy?: (times: number) => number;
    },
  ) {
    // 발행용 클라이언트
    this.redisClient = createClient({
      socket: {
        host: redisOptions.host,
        port: redisOptions.port,
      },
      password: redisOptions.password,
      database: redisOptions.db,
    });

    // Connect immediately
    this.redisClient.connect().catch((error) => {
      console.error('❌ Failed to connect to Redis messaging service:', error);
    });

    // 구독용 클라이언트 (별도 연결)
    this.redisSubClient = createClient({
      socket: {
        host: redisOptions.host,
        port: redisOptions.port,
      },
      password: redisOptions.password,
      database: redisOptions.db,
    });

    // Connect the subscriber client
    this.redisSubClient.connect().catch((error) => {
      console.error('❌ Failed to connect Redis subscriber client:', error);
    });

    // Microservice 클라이언트 초기화
    this.redisMessageClient = ClientProxyFactory.create({
      transport: Transport.REDIS,
      options: {
        host: redisOptions.host,
        port: redisOptions.port,
        password: redisOptions.password,
      },
    });
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

  getSubClient(): ReturnType<typeof createClient> {
    return this.redisSubClient;
  }

  getMessageClient(): ClientProxy {
    return this.redisMessageClient;
  }

  // Add key prefix manually
  private getPrefixedKey(key: string): string {
    return this.redisOptions.keyPrefix
      ? `${this.redisOptions.keyPrefix}${key}`
      : key;
  }
}
