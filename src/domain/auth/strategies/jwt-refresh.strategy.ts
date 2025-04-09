import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { PassportStrategy } from '@nestjs/passport';
import { Request as ExpressRequest } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: ExpressRequest) => JwtRefreshStrategy.extractJwtFromCookies(req),
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.refreshSecret'),
      passReqToCallback: true,
    });
  }

  private static extractJwtFromCookies(req: ExpressRequest): string | null {
    if (req.cookies && 'refresh_token' in req.cookies) {
      return req.cookies.refresh_token as string;
    }
    return null;
  }

  validate(
    req: ExpressRequest,
    payload: any,
  ): { id: string; email: string; refreshToken: string | undefined } {
    //? read from cookies first and fallback to header
    const authHeader = req.get('Authorization');
    const refreshToken =
      authHeader?.replace('Bearer', '').trim() ?? req.cookies?.refresh_token;
    // const user = await this.userService.findOneById(payload.sub)
    return {
      id: payload.sub,
      email: payload.name,
      refreshToken,
    };
  }
}
