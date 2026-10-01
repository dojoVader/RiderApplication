import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '../../../dtos/entities/user.entity';
import {
  NotImplementedException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('SECRET'),
    });
  }

  async validate(payload: any) {
    const user = await this.findUserById(payload.sub);
    if (!user) throw new UnauthorizedException();
    return user;
  }

  // TODO: wire up a persistence layer for users.
  private async findUserById(_id: number): Promise<User | null> {
    throw new NotImplementedException('Persistence layer removed');
  }
}
