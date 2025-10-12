import { SetMetadata } from '@nestjs/common';

export type InvalidateTagFunction = (request: any) => string[];

export interface CacheInvalidateOptions {
  tags: string[] | InvalidateTagFunction; // 정적 태그 배열 또는 동적 태그 생성 함수 (예: ['schools:1:calendars'])
}

export const CACHE_INVALIDATE_KEY = 'cache:invalidate';

/**
 * 메서드 실행 후 특정 태그의 캐시를 무효화하는 데코레이터
 * @param options - tags (무효화할 캐시 태그 배열)
 */
export const CacheInvalidate = (options: CacheInvalidateOptions) =>
  SetMetadata(CACHE_INVALIDATE_KEY, options);
