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
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: ExpressRequest) => JwtRefreshStrategy.extractJwtFromCookies(req),
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

  //? 이 함수에서 리턴되는 값이 request.user 에 설정된다.
  //? - to be used in Guard, Controller
  validate(req: ExpressRequest, payload: any): IRequestUser {
    //? read from header first and fallback to cookies
    const authHeader = req.get('Authorization');
    const refreshToken =
      authHeader?.replace('Bearer', '').trim() ?? req.cookies?.refresh_token;
    // const user = await this.userService.findOneById(payload.sub)
    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      refreshToken,
    };
  }
}
