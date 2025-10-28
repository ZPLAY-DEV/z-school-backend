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
import { from, Observable, switchMap } from 'rxjs';
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
    console.log(`💾 [Cache Save] Added to ${tagKey}: ${requestUrl}`);
  }

  async _invalidateCacheTags(tagKey: string) {
    const client = await this._getRedisClient();
    const keys = await client?.sMembers(tagKey);
    console.log(
      `🔍 [Cache Invalidate] Tag: ${tagKey}, Found ${keys?.length || 0} keys:`,
      keys,
    );
    if (keys && keys.length > 0) {
      // 캐시 삭제와 태그 정리를 병렬 처리하여 응답 지연 최소화
      const deleteTasks = keys.map((key) =>
        Promise.allSettled([
          this.cacheManager.del(key),
          client?.sRem(tagKey, key),
        ]),
      );
      await Promise.allSettled(deleteTasks);
      await client?.del(tagKey);
      console.log(
        `✅ [Cache Invalidate] Completed for ${tagKey}, deleted ${keys.length} keys`,
      );
    } else {
      console.log(`⚠️  [Cache Invalidate] No keys found for tag: ${tagKey}`);
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

    // 동기적으로 태그에 캐시 키 저장 (캐시가 확실히 저장되도록)
    console.log(`📌 [Cache trackBy] URL: ${requestUrl}, Tags:`, tags);
    // 비동기 저장이지만 fire-and-forget이 아닌 즉시 실행
    void (async () => {
      try {
        for (const tag of tags) {
          await this._saveCacheTags(requestUrl, tag);
        }
      } catch (e) {
        console.error('Redis is down', e);
      }
    })();

    return requestUrl;
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const { httpAdapter } = this.httpAdapterHost;
    const isGetRequest = httpAdapter.getRequestMethod(request) === 'GET';

    // x-clear-cache 헤더 처리 (기존 유지)
    if (request.headers['x-clear-cache']) {
      try {
        await this.cacheManager.clear();
        await this.clearAllCacheSets();
      } catch (e) {
        console.error(`Redis is down`, e);
      }
    }

    // POST/PUT/DELETE/PATCH 요청 시 invalidation (GET 요청은 부모 CacheInterceptor가 처리)
    if (!isGetRequest) {
      // POST/PUT/DELETE/PATCH 요청 시 invalidation
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

        console.log(
          `🔄 [Cache Invalidate Request] Method: ${httpAdapter.getRequestMethod(request)}, URL: ${httpAdapter.getRequestUrl(request)}, Tags:`,
          tags,
        );

        if (tags.length > 0) {
          // 핸들러 실행 후, 응답 전에 동기적으로 캐시 무효화
          const observable$ = super.intercept(context, next);
          return from(observable$).pipe(
            switchMap(
              (obs) =>
                new Observable((subscriber) => {
                  const results: any[] = [];
                  obs.subscribe({
                    next: (value) => {
                      results.push(value);
                    },
                    error: (err) => {
                      subscriber.error(err);
                    },
                    complete: () => {
                      // 핸들러 완료 후, 응답 전에 캐시 무효화
                      console.log(
                        `🚀 [Cache Invalidate] Handler completed, starting invalidation BEFORE response:`,
                        tags,
                      );
                      void (async () => {
                        for (const tag of tags) {
                          try {
                            await this._invalidateCacheTags(`tag:${tag}`);
                          } catch (e) {
                            console.error('❌ Cache invalidation failed', e);
                          }
                        }
                        console.log(
                          `✨ [Cache Invalidate] Completed, sending response now`,
                        );
                        // 응답 전송
                        results.forEach((value) => subscriber.next(value));
                        subscriber.complete();
                      })();
                    },
                  });
                }),
            ),
          );
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
    } catch (error) {
      console.error('Failed to clear cache sets:', error);
      return false;
    }
  }
}
