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

@Injectable()
export class JwtContextGuard implements CanActivate {
  private readonly logger = new Logger(JwtContextGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

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
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('jwt.authSecret'),
      });

      // 현재 요청의 context 추출
      const requestRole = request.headers['x-role'] as Role;
      const requestSchoolIdHeader = request.headers['x-school-id'] as string;
      const requestSchoolId =
        requestSchoolIdHeader && requestSchoolIdHeader !== 'null'
          ? parseInt(requestSchoolIdHeader)
          : null;

      // Context 변경 감지
      if (payload.role !== requestRole) {
        this.logger.warn(
          `Role mismatch: token=${payload.role}, request=${requestRole}, userId=${payload.sub}`,
        );
        throw new UnauthorizedException('Role changed - please re-login');
      }

      if (payload.schoolId !== requestSchoolId) {
        this.logger.warn(
          `SchoolId mismatch: token=${payload.schoolId}, request=${requestSchoolId}, userId=${payload.sub}`,
        );
        throw new UnauthorizedException(
          'School context changed - please re-login',
        );
      }

      // Context hash 검증
      const expectedHash = this.generateContextHash(
        requestRole,
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

      // 성공적인 검증 로그
      this.logger.debug(
        `Token validated successfully for user ${payload.sub}, role ${payload.role}, schoolId ${payload.schoolId}`,
      );

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
}
