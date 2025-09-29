import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { PassportStrategy } from '@nestjs/passport';
import { Request as ExpressRequest } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { IRequestUser } from 'src/common/interfaces';
@Injectable()
export class JwtAuthStrategy extends PassportStrategy(Strategy, 'auth') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: ExpressRequest) => JwtAuthStrategy.extractJwtFromCookies(req),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.authSecret'),
    });
  }

  private static extractJwtFromCookies(req: ExpressRequest): string | null {
    if (req.cookies && 'accessToken' in req.cookies) {
      return req.cookies.accessToken as string;
    }
    return null;
  }

  //? 이 함수에서 리턴되는 값이 request.user 에 설정된다.
  //? - to be used in Guard, Controller
  validate(payload: any): IRequestUser {
    // payload 는 JWT 에 들어있는 claim 정보
    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      schoolId: payload.schoolId,
    };
  }
}
