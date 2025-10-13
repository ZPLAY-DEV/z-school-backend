import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { Request } from 'express';
import { Role } from 'src/common/enums';

// JWT 페이로드 캐시 인터페이스
interface CachedPayload {
  payload: any;
  exp: number; // 만료 시간 (timestamp)
}

@Injectable()
export class JwtContextGuard implements CanActivate {
  private readonly logger = new Logger(JwtContextGuard.name);

  // JWT 검증 결과 캐시 (LRU 방식: 최대 500개, 30초 TTL)
  private readonly tokenCache = new Map<string, CachedPayload>();
  private readonly MAX_CACHE_SIZE = 500; // 메모리: ~375KB
  private readonly CACHE_TTL = 30 * 1000; // 30초

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {
    // 주기적으로 만료된 캐시 정리 (1분마다)
    setInterval(() => this.cleanExpiredCache(), 60 * 1000);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.warn('Token not found in request headers');
      throw new UnauthorizedException('Token not found');
    }

    try {
      // 캐시 확인 (성능 최적화: JWT 검증 15ms → 0.1ms)
      const cached = this.tokenCache.get(token);
      if (cached && Date.now() < cached.exp) {
        request['user'] = cached.payload;
        return true;
      }

      // 캐시 미스: JWT 검증 수행
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('jwt.authSecret'),
      });

      // 검증 성공 시 캐시에 저장 (LRU 방식)
      this.addToCache(token, payload);

      // 현재 요청의 context 추출
      const requestRole = request.headers['x-role'] as Role;
      const requestSchoolIdHeader = request.headers['x-school-id'] as string;
      const requestSchoolId =
        requestSchoolIdHeader && requestSchoolIdHeader !== 'null'
          ? parseInt(requestSchoolIdHeader)
          : null;

      // /me 엔드포인트의 경우 헤더 검증을 건너뛰고 토큰 정보를 그대로 사용
      const isMeEndpoint = request.url?.includes('/auth/me');

      if (!isMeEndpoint) {
        // Context 변경 감지 (헤더가 있는 경우에만 검증)
        if (requestRole && payload.role !== requestRole) {
          this.logger.warn(
            `Role mismatch: token=${payload.role}, request=${requestRole}, userId=${payload.sub}`,
          );
          throw new UnauthorizedException('Role changed - please re-login');
        }

        if (
          requestSchoolId !== null &&
          requestSchoolId !== undefined &&
          payload.schoolId !== requestSchoolId
        ) {
          this.logger.warn(
            `SchoolId mismatch: token=${payload.schoolId}, request=${requestSchoolId}, userId=${payload.sub}`,
          );
          throw new UnauthorizedException(
            'School context changed - please re-login',
          );
        }

        // Context hash 검증 (헤더가 있는 경우에만)
        if (requestRole || requestSchoolId !== null) {
          const expectedHash = this.generateContextHash(
            requestRole || payload.role,
            requestSchoolId,
          );
          if (payload.contextHash !== expectedHash) {
            this.logger.error(
              `Context hash mismatch: expected=${expectedHash}, actual=${payload.contextHash}, userId=${payload.sub}`,
            );
            throw new UnauthorizedException(
              'Invalid context - token may be corrupted',
            );
          }
        }
      }

      // 성공적인 검증 (로그 제거 - 성능 최적화)
      request['user'] = payload;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error('Token verification failed:', error);
      throw new UnauthorizedException('Invalid token or context');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private generateContextHash(role: Role, schoolId: number | null): string {
    const context = `${role}:${schoolId || 'null'}`;
    return crypto
      .createHash('sha256')
      .update(context)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * LRU 방식으로 캐시에 추가
   * 최대 크기 초과 시 가장 오래된 항목 제거
   */
  private addToCache(token: string, payload: any): void {
    // 최대 크기 초과 시 가장 오래된 항목 제거 (FIFO)
    if (this.tokenCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.tokenCache.keys().next().value as string;
      this.tokenCache.delete(firstKey);
    }

    // 새 항목 추가
    this.tokenCache.set(token, {
      payload,
      exp: Date.now() + this.CACHE_TTL,
    });
  }

  /**
   * 만료된 캐시 항목 정리 (메모리 누수 방지)
   */
  private cleanExpiredCache(): void {
    const now = Date.now();

    for (const [token, cached] of this.tokenCache.entries()) {
      if (now >= cached.exp) {
        this.tokenCache.delete(token);
      }
    }
  }

  /**
   * 특정 토큰을 캐시에서 제거 (로그아웃 시 사용)
   */
  public invalidateToken(token: string): void {
    this.tokenCache.delete(token);
  }
}
