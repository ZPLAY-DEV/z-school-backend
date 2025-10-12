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
  constructor(
    @Inject(CACHE_MANAGER) cacheManager: Cache,
    @Inject(KEYV_REDIS) private readonly keyvRedis: KeyvRedis<string>,
    reflector: Reflector,
  ) {
    super(cacheManager, reflector);
  }

  async _getRedisClient() {
    return await this.keyvRedis.getClient();
  }

  async _saveCacheTags(requestUrl: string, tag: string) {
    const tagKey = `tag:${tag}`;
    const client = await this._getRedisClient();
    const exists = await client?.sIsMember(tagKey, requestUrl);
    if (!exists) {
      await client?.sAdd(tagKey, requestUrl);
      console.log(`✅ cache updated for: ${requestUrl} [tag: ${tag}]`);
    } else {
      console.log(`⚠️ cache bypassed for: ${requestUrl} [tag: ${tag}]`);
    }
  }

  async _invalidateCacheTags(tagKey: string) {
    const client = await this._getRedisClient();
    const keys = await client?.sMembers(tagKey);
    if (keys && keys.length > 0) {
      const pipeline = client?.multi(); // node-redis에서는 multi() 사용
      if (pipeline) {
        for (const key of keys) {
          pipeline.sRem(tagKey, key);
          pipeline.del(key);
          console.log(`🚫 cache removed for: ${key}`);
        }
        pipeline.del(tagKey);
        await pipeline.exec(); // node-redis에서도 exec()로 실행
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

    // 비동기로 태그에 캐시 키 저장
    process.nextTick(async () => {
      try {
        for (const tag of tags) {
          await this._saveCacheTags(requestUrl, tag);
        }
      } catch (e) {
        console.error('Redis is down', e);
      }
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

    // x-clear-cache 헤더 처리 (기존 유지)
    if (request.headers['x-clear-cache']) {
      console.log('🗑️ redis: CLEAR');

      try {
        await this.cacheManager.clear();
        await this.clearAllCacheSets();
      } catch (e) {
        console.error(`Redis is down`, e);
      }
    }

    // GET 요청 시 캐시 HIT/MISS 로깅 (기존 유지)
    if (isGetRequest) {
      const requestUrl = httpAdapter.getRequestUrl(request);
      const cachedResponse = await this.cacheManager.get(requestUrl);
      if (cachedResponse) {
        console.log('😎 cache: HIT');
      } else {
        console.log('😱 cache: MISS');
      }
    } else {
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

        if (tags.length > 0) {
          // 응답 후에 비동기로 무효화
          const observable$ = super.intercept(context, next);
          return from(observable$).pipe(
            switchMap(
              (obs) =>
                new Observable((subscriber) => {
                  obs.subscribe({
                    next: (value) => subscriber.next(value),
                    error: (err) => subscriber.error(err),
                    complete: () => {
                      // 응답 완료 후 캐시 무효화 (비동기)
                      process.nextTick(async () => {
                        for (const tag of tags) {
                          try {
                            await this._invalidateCacheTags(`tag:${tag}`);
                          } catch (e) {
                            console.error('Cache invalidation failed', e);
                          }
                        }
                      });
                      subscriber.complete();
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
