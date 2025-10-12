import { SetMetadata } from '@nestjs/common';

export type TagFunction = (request: any) => string[];

export interface HttpCacheOptions {
  ttl?: number; // 초 단위 (기본값: 300 = 5분) - 내부적으로 밀리초로 변환됨
  tags: string[] | TagFunction; // 정적 태그 배열 또는 동적 태그 생성 함수 (예: ['schools:1:calendars'])
}

export const HTTP_CACHE_KEY = 'http:cache';

// NestJS CacheInterceptor가 사용하는 표준 TTL 키
export const CACHE_TTL_METADATA = 'cache_ttl';

/**
 * HTTP 캐시를 적용하는 데코레이터
 * @param options - ttl (초 단위), tags (캐시 태그 배열)
 */
export const HttpCache = (options: HttpCacheOptions) => {
  // TTL을 초 단위에서 밀리초 단위로 변환 (Keyv는 밀리초 사용)
  const ttlInMs = options.ttl ? options.ttl * 1000 : 300000; // 기본값: 5분

  return (
    target: object,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    // 커스텀 캐시 옵션 저장
    SetMetadata(HTTP_CACHE_KEY, options)(target, propertyKey!, descriptor!);

    // NestJS CacheInterceptor가 읽는 표준 TTL 메타데이터 저장 (밀리초)
    SetMetadata(CACHE_TTL_METADATA, ttlInMs)(target, propertyKey!, descriptor!);
  };
};
