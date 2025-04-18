import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { PassportStrategy } from '@nestjs/passport';
import { Request as ExpressRequest } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { IRequestUser } from 'src/common/interfaces';
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'refresh') {
  constructor(configService: ConfigService) {
    //? read from header first and fallback to cookies
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: ExpressRequest) => {
          const token = JwtRefreshStrategy.extractJwtFromCookies(req);
          return token;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.refreshSecret'),
      passReqToCallback: true,
    });
  }

  private static extractJwtFromCookies(req: ExpressRequest): string | null {
    if (req.cookies && 'refreshToken' in req.cookies) {
      return req.cookies.refreshToken as string;
    }
    return null;
  }

  //? 이 함수에서 리턴되는 값이 request.user 에 설정된다.
  //? - to be used in Guard, Controller
  //? - refresh token 이 JWT 형식이 아니면, validate 함수 호출은 안된다. (!)
  validate(req: ExpressRequest, payload: any): IRequestUser {
    //? read from header first and fallback to cookies
    const authHeader = req.get('Authorization');
    const refreshToken =
      authHeader?.replace('Bearer', '').trim() ?? req.cookies?.refreshToken;
    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      refreshToken,
    };
  }
}
