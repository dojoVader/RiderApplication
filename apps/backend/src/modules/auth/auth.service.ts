import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../../generated/prisma/enums';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async register(email: string, password: string, role: Role = Role.RIDER) {
    // Check if the user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new HttpException(
        'The user already exists on this platform',
        HttpStatus.CONFLICT,
      );
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const { passwordHash: _, ...user } = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
      },
    });
    return user;
  }

  async login(email: string, password: string, res: Response) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('SECRET'),
    });
    // Set HTTP-only, same-site cookie
    res.cookie('jwt', accessToken, {
      ...this.sessionCookieOptions(),
      maxAge: 1000 * 60 * 60, // 1 hour
    });

    return {
      access_token: accessToken,
      role: user.role,
    };
  }

  // Browsers only clear a cookie when the attributes match the ones it was set with.
  logout(res: Response) {
    res.clearCookie('jwt', this.sessionCookieOptions());
  }

  private sessionCookieOptions() {
    return {
      httpOnly: true, // Prevents client-side JavaScript access
      // Secure cookies are never sent over plain http by non-browser clients
      // (HTTPie, curl), so only require HTTPS in production.
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict' as const,
      path: '/', // Accessible across the app
    };
  }

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email: username },
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    const isPasswordMatched = await bcrypt.compare(pass, user.passwordHash);
    if (!isPasswordMatched) {
      throw new UnauthorizedException('Invalid password');
    }
    return user;
  }
}
