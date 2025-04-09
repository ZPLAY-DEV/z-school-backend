import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from 'src/domain/auth/auth.service';
import { UserCredentialsDto } from 'src/domain/auth/dto/user-credentials.dto';
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  async validate(dto: UserCredentialsDto): Promise<any> {
    const user = await this.authService.validateUser(dto);

    if (!user) {
      throw new UnauthorizedException('unauthorized');
    }

    return user;
  }
}
