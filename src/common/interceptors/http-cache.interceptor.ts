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
  getAllEntitiesFromUrl,
  getBaseEntityFromUrl,
} from 'src/helpers/uri-segments';

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

  _extractCacheTagsToRemove(baseUrl: string): string[] {
    return getAllEntitiesFromUrl(baseUrl).map((entity) => `cache:${entity}`);
  }

  async _saveCacheTags(requestUrl: string, baseEntity: string) {
    const tagKey = `cache:${baseEntity}`;
    const client = await this._getRedisClient();
    const exists = await client?.sIsMember(tagKey, requestUrl);
    if (!exists) {
      await client?.sAdd(tagKey, requestUrl);
      console.log(`✅ cache updated for: ${requestUrl}`);
    } else {
      console.log(`⚠️ cache bypassed for: ${requestUrl}`);
    }
  }

  async _invalidateCacheTags(tag: string) {
    const client = await this._getRedisClient();
    const keys = await client?.sMembers(tag);
    if (keys && keys.length > 0) {
      const pipeline = client?.multi(); // node-redis에서는 multi() 사용
      if (pipeline) {
        for (const key of keys) {
          pipeline.sRem(tag, key);
          pipeline.del(key);
          console.log(`🚫 cache removed for: ${key}`);
        }
        pipeline.del(tag);
        await pipeline.exec(); // node-redis에서도 exec()로 실행
      }
    }
  }

  trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest();
    const { httpAdapter } = this.httpAdapterHost;

    const isGetRequest = httpAdapter.getRequestMethod(request) === 'GET';
    const requestUrl = httpAdapter.getRequestUrl(request) as string;
    const baseUrl = requestUrl.split('?')[0];

    const excludePaths = ['/v1/version', '/v1/counts', '/v1/bust'];
    if (isGetRequest && excludePaths.includes(requestUrl)) return undefined;
    if (isGetRequest && requestUrl.startsWith('/v1/users')) return undefined;

    if (!isGetRequest) {
      const cacheTags = this._extractCacheTagsToRemove(requestUrl);
      console.log('⛔ cache tags to remove: ', cacheTags);
      if (cacheTags.length > 0) {
        process.nextTick(async () => {
          for (const tag of cacheTags) {
            try {
              await this._invalidateCacheTags(tag);
            } catch (e) {
              console.error(`Redis is down`, e);
              return undefined;
            }
          }
        });
      }
      return undefined;
    }

    process.nextTick(async () => {
      try {
        const baseEntity = getBaseEntityFromUrl(baseUrl);
        await this._saveCacheTags(requestUrl, baseEntity);
      } catch (e) {
        console.error(`Redis is down`, e);
        return undefined;
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

    if (request.headers['x-clear-cache']) {
      console.log('🗑️ redis: CLEAR');

      try {
        await this.cacheManager.clear();
        await this.clearAllCacheSets();
      } catch (e) {
        console.error(`Redis is down`, e);
      }
    }

    if (isGetRequest) {
      const requestUrl = httpAdapter.getRequestUrl(request);
      const cachedResponse = await this.cacheManager.get(requestUrl);
      if (cachedResponse) {
        console.log('😎 cache: HIT');
      } else {
        console.log('😱 cache: MISS');
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
        arguments: ['cache:*'],
      });

      return true;
    } catch (error) {
      console.error('Failed to clear cache sets:', error);
      return false;
    }
  }
}
