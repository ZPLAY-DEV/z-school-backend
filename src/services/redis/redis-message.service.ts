// src/services/redis/redis-message.service.ts
import { Inject, Injectable } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { Redis } from 'ioredis';
import { lastValueFrom } from 'rxjs';
import { REDIS_MESSAGE_OPTIONS } from 'src/common/constants';

@Injectable()
export class RedisMessageService {
  private readonly redisClient: Redis; // Pub/Sub용 클라이언트
  private readonly redisSubClient: Redis; // 구독 전용 클라이언트
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
    this.redisClient = new Redis({
      host: redisOptions.host,
      port: redisOptions.port,
      password: redisOptions.password,
      keyPrefix: redisOptions.keyPrefix,
      db: redisOptions.db,
      retryStrategy: redisOptions.retryStrategy,
    });

    // 구독용 클라이언트 (별도 연결)
    this.redisSubClient = this.redisClient.duplicate();

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
    const serializedMessage = JSON.stringify(message);
    await this.redisClient.publish(channel, serializedMessage);
  }

  // 메시지 구독 (Pub/Sub)
  subscribe(channel: string, callback: (message: any) => void): void {
    // void 타입은 subscribe 메서드가 promise를 처리하지 않는다고 명시적으로 나타냄
    void this.redisSubClient.subscribe(channel);
    this.redisSubClient.on('message', (subChannel, message) => {
      if (subChannel === channel) {
        callback(JSON.parse(message));
      }
    });
  }

  // 구독 해제
  async unsubscribe(channel: string): Promise<void> {
    await this.redisSubClient.unsubscribe(channel);
  }

  // Microservice 패턴으로 이벤트 발행
  async emitEvent(pattern: string, data: any): Promise<void> {
    await this.redisMessageClient.emit(pattern, data).toPromise();
  }

  // Microservice 패턴으로 메시지 전송 (응답 기대)
  async sendMessage<T>(pattern: string, data: any): Promise<T> {
    return (await lastValueFrom(
      this.redisMessageClient.send(pattern, data),
    )) as T;
  }

  // 클라이언트 상태 확인
  async ping(): Promise<string> {
    return await this.redisClient.ping();
  }

  // Redis 클라이언트 반환 (저수준 작업용)
  getClient(): Redis {
    return this.redisClient;
  }

  getSubClient(): Redis {
    return this.redisSubClient;
  }

  getMessageClient(): ClientProxy {
    return this.redisMessageClient;
  }
}
