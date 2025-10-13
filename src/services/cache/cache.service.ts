import KeyvRedis from '@keyv/redis';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { RedisClientType } from 'redis';
import { KEYV_REDIS } from 'src/common/constants';

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(KEYV_REDIS) private keyvRedis: KeyvRedis<string>,
  ) {}

  private async _getRedisClient() {
    return await this.keyvRedis.getClient();
  }

  /**
   * 특정 태그에 속한 모든 캐시 무효화
   * Redis SET 사용 (pipeline으로 일괄 처리)
   */
  async invalidateTags(tags: string[]): Promise<void> {
    const client = (await this._getRedisClient()) as RedisClientType;

    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      const cacheKeys = await client?.sMembers(tagKey);

      if (cacheKeys && cacheKeys.length > 0) {
        const pipeline = client?.multi();
        if (pipeline) {
          for (const key of cacheKeys) {
            pipeline.sRem(tagKey, key);
            pipeline.del(key);
          }
          pipeline.del(tagKey);
          await pipeline.exec();
          console.log(
            `🗑️ Invalidated ${cacheKeys.length} keys for tag: ${tag}`,
          );
        }
      }
    }
  }

  /**
   * 학교별 특정 리소스 캐시 무효화
   * @example invalidateSchool(1, 'calendars') -> 'schools:1:calendars'
   */
  async invalidateSchool(schoolId: number, resource: string): Promise<void> {
    await this.invalidateTags([`schools:${schoolId}:${resource}`]);
  }

  /**
   * 학교-학기별 특정 리소스 캐시 무효화
   * @example invalidateSchoolTerm(1, 2, 'lessons') -> 'schools:1:terms:2:lessons'
   */
  async invalidateSchoolTerm(
    schoolId: number,
    termId: number,
    resource: string,
  ): Promise<void> {
    await this.invalidateTags([
      `schools:${schoolId}:terms:${termId}:${resource}`,
    ]);
  }

  /**
   * 학교-학기-학생별 특정 리소스 캐시 무효화
   * @example invalidateSchoolTermStudent(1, 2, 3, 'weekly-schooldays') -> 'schools:1:terms:2:students:3:weekly-schooldays'
   */
  async invalidateSchoolTermStudent(
    schoolId: number,
    termId: number,
    studentId: number,
    resource: string,
  ): Promise<void> {
    await this.invalidateTags([
      `schools:${schoolId}:terms:${termId}:students:${studentId}:${resource}`,
    ]);
  }
}
