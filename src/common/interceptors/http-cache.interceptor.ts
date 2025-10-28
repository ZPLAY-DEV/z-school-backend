// Redis 실제 저장 구조:
//
// ┌───────────────────────────────────────────┐
// │ Cached Data (String)                      │
// ├───────────────────────────────────────────┤
// │ keyv::keyv:/v1/offerings?page=1  → {...}  │
// │ keyv::keyv:/v1/offerings?page=2  → {...}  │
// │ keyv::keyv:/v1/students?id=123   → {...}  │
// └───────────────────────────────────────────┘

// ┌───────────────────────────────────────────┐
// │ Tag Sets (Set)                            │
// ├───────────────────────────────────────────┤
// │ tag:offerings → {                         │
// │   "/api/offerings?page=1",                │
// │   "/api/offerings?page=2"                 │
// │ }                                         │
// │                                           │
// │ tag:students → {                          │
// │   "/api/students?id=123"                  │
// │ }                                         │
// └───────────────────────────────────────────┘
//

import KeyvRedis from '@keyv/redis';
import { CACHE_MANAGER, CacheInterceptor } from '@nestjs/cache-manager';
import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Cache } from 'cache-manager';
import { Observable } from 'rxjs';
import { KEYV_REDIS } from 'src/common/constants';
import {
  CACHE_INVALIDATE_KEY,
  CacheInvalidateOptions,
} from 'src/common/decorators/cache-invalidate.decorator';
import {
  HTTP_CACHE_KEY,
  HttpCacheOptions,
} from 'src/common/decorators/http-cache.decorator';

@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
  private redisClient: any; // Redis 클라이언트를 캐싱
  private readonly CACHE_NAMESPACE = 'keyv::keyv'; // Keyv의 실제 namespace (keyv::keyv: prefix)

  constructor(
    @Inject(CACHE_MANAGER) cacheManager: Cache,
    @Inject(KEYV_REDIS) private readonly keyvRedis: KeyvRedis<string>,
    reflector: Reflector,
  ) {
    super(cacheManager, reflector);
    // Redis 클라이언트를 초기화 시 한 번만 가져옴 (성능 최적화)
    void this.keyvRedis.getClient().then((client) => {
      this.redisClient = client;
    });
  }

  async _getRedisClient(): Promise<any> {
    // 이미 캐싱된 클라이언트가 있으면 반환, 없으면 새로 가져옴
    if (!this.redisClient) {
      this.redisClient = await this.keyvRedis.getClient();
    }
    return this.redisClient;
  }

  async _saveCacheTags(requestUrl: string, tag: string) {
    const tagKey = `tag:${tag}`;
    const client = await this._getRedisClient();
    // sAdd는 이미 존재하면 무시하므로, sIsMember 체크 없이 바로 sAdd 호출 (성능 최적화)
    await client?.sAdd(tagKey, requestUrl);
  }

  async _saveCacheTagsBulk(requestUrl: string, tags: string[]) {
    if (!tags || tags.length === 0) return;
    const client = await this._getRedisClient();
    if (!client) return;

    // Pipeline을 사용하여 여러 태그를 한 번에 저장 (네트워크 왕복 1번)
    const pipeline = typeof client.multi === 'function' ? client.multi() : null;
    if (pipeline) {
      for (const tag of tags) {
        pipeline.sAdd(`tag:${tag}`, requestUrl);
      }
      await pipeline.exec();
      return;
    }

    // Pipeline이 없으면 병렬 처리
    await Promise.allSettled<void>(
      tags.map(async (tag: string) => {
        await client.sAdd(`tag:${tag}`, requestUrl);
      }),
    );
  }

  async _invalidateCacheTags(tagKey: string) {
    const client = await this._getRedisClient();
    const rawKeys = client ? await client.sMembers(tagKey) : [];
    const keys: string[] = Array.isArray(rawKeys) ? (rawKeys as string[]) : [];

    if (keys && keys.length > 0) {
      const pipeline = client?.multi();
      if (pipeline) {
        // Pipeline으로 한 번에 처리 (네트워크 왕복 1번으로 최적화)
        for (const key of keys) {
          // Keyv namespace를 추가하여 실제 캐시 키 삭제
          const fullKey = `${this.CACHE_NAMESPACE}:${key}`;
          pipeline.del(fullKey); // 실제 캐시 데이터 삭제
          pipeline.sRem(tagKey, key); // Tag Set에서 제거
        }
        pipeline.del(tagKey); // Tag Set 자체 삭제
        await pipeline.exec();
      }
    }
  }

  trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest();
    const { httpAdapter } = this.httpAdapterHost;

    const isGetRequest = httpAdapter.getRequestMethod(request) === 'GET';

    // GET 요청이 아니면 캐시하지 않음
    if (!isGetRequest) return undefined;

    // Reflector로 @HttpCache 데코레이터 확인 (opt-in)
    const cacheOptions = this.reflector.get<HttpCacheOptions>(
      HTTP_CACHE_KEY,
      context.getHandler(),
    );

    // 데코레이터가 없으면 캐시하지 않음
    if (!cacheOptions) return undefined;

    const requestUrl = httpAdapter.getRequestUrl(request) as string;

    // 태그 평가 (함수면 실행, 배열이면 그대로 사용)
    const tags =
      typeof cacheOptions.tags === 'function'
        ? cacheOptions.tags(request)
        : cacheOptions.tags;

    // 태그 저장은 bulk pipeline + fire-and-forget (process.nextTick)으로 성능 최적화
    process.nextTick(() => {
      void this._saveCacheTagsBulk(requestUrl, tags).catch(() => {});
    });

    return requestUrl;
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const { httpAdapter } = this.httpAdapterHost;
    const isGetRequest = httpAdapter.getRequestMethod(request) === 'GET';

    // x-clear-cache 헤더 처리
    if (request.headers['x-clear-cache']) {
      await Promise.allSettled([
        this.cacheManager.clear(),
        this.clearAllCacheSets(),
      ]);
    }

    // POST/PUT/DELETE/PATCH 요청 시 invalidation (GET 요청은 부모 CacheInterceptor가 처리)
    if (!isGetRequest) {
      const invalidateOptions = this.reflector.get<CacheInvalidateOptions>(
        CACHE_INVALIDATE_KEY,
        context.getHandler(),
      );

      if (invalidateOptions) {
        // 태그 평가 (함수면 실행, 배열이면 그대로 사용)
        const tags =
          typeof invalidateOptions.tags === 'function'
            ? invalidateOptions.tags(request)
            : invalidateOptions.tags;

        if (tags.length > 0) {
          // 응답 지연 최소화를 위해 fire-and-forget 스케줄링 (단순하고 효율적)
          process.nextTick(() => {
            void (async () => {
              for (const tag of tags) {
                try {
                  await this._invalidateCacheTags(`tag:${tag}`);
                } catch {
                  // ignore
                }
              }
            })().catch(() => {});
          });
        }
      }
    }

    return super.intercept(context, next);
  }

  async clearAllCacheSets() {
    try {
      const client = await this._getRedisClient();
      const luaScript = `
        local keys = redis.call('SCAN', 0, 'MATCH', ARGV[1], 'COUNT', 100)
        for _, key in ipairs(keys[2]) do
          redis.call('DEL', key)
        end
      `;
      await client?.eval(luaScript, {
        keys: [],
        arguments: ['tag:*'],
      });

      return true;
    } catch {
      return false;
    }
  }
}
