//jwt.guard.ts
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const httpRequest = context.switchToHttp().getRequest<Request>();
    const payload = httpRequest.cookies?.jwt;
    if (!payload) {
      throw new UnauthorizedException();
    }
    // Validate the JWT token from cookies
    const status = this.jwtService.verify(payload, {
      secret: this.configService.get<string>('SECRET'),
    });
    httpRequest.user = status;
    if (status) {
      return true;
    }
  }
}
