import {
  Inject,
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { REDIS_DISPATCH_OPTIONS } from 'src/common/constants';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';

interface RedisDispatchOptions {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

@Injectable()
export class RedisDispatchService implements OnModuleInit {
  private redisClient: RedisClientType;

  constructor(
    @Inject(REDIS_DISPATCH_OPTIONS)
    private readonly redisOptions: RedisDispatchOptions,
  ) {}

  async onModuleInit() {
    this.redisClient = createClient({
      socket: {
        host: this.redisOptions.host,
        port: this.redisOptions.port,
      },
      password: this.redisOptions.password,
      database: this.redisOptions.db,
      legacyMode: false, // 최신 방식 사용
    });

    this.redisClient.on('error', (err) =>
      console.error('❌ Redis error:', err),
    );

    await this.redisClient.connect();
    await this.ping();
    console.log(
      `✅ Redis connected: ${this.redisOptions.host}:${this.redisOptions.port}`,
    );
  }

  async ping(): Promise<string> {
    return await this.redisClient.ping();
  }

  //? 학생별 열람 상태 초기화
  async initStudentReadStatus(
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
        HttpErrorConstants.INTERNAL_DATABASE_ERROR,
      );
    }
  }

  //? 보상 로직: 특정 dispatchId에 대한 키 삭제
  async clearStudentReadStatus(dispatchId: number): Promise<void> {
    const keys = await this.redisClient.keys(
      `dispatch:${dispatchId}:student:*`,
    );
    if (keys.length > 0) {
      await this.redisClient.del(keys);
    }
  }
}
