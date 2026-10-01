import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotImplementedException,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '../../dtos/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  // TODO: wire up a persistence layer for users.
  private async findUserByEmail(email: string): Promise<User | null> {
    throw new NotImplementedException('Persistence layer removed');
  }

  private async saveUser(user: Omit<User, 'id'>): Promise<User> {
    throw new NotImplementedException('Persistence layer removed');
  }

  async register(email: string, password: string, role = 'user', name = '') {
    // Check if the user already exists
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      throw new HttpException(
        'The user already exists on this platform',
        HttpStatus.CONFLICT,
      );
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    return this.saveUser({
      email,
      password: hashedPassword,
      role,
      name,
    });
  }

  async login(email: string, password: string, res: Response) {
    const user = await this.findUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // // Check if installation exists for the user
    // const installation = await findInstallationByUserId(user.id);
    // if (!installation) {
    //   throw new BadRequestException({
    //     message:
    //       'No installation found for this user.',
    //   });
    // }

    const payload = { email: user.email, sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('SECRET'),
    });
    // Set HTTP-only, same-site cookie
    res.cookie('jwt', accessToken, {
      httpOnly: true, // Prevents client-side JavaScript access
      secure: true, // Use secure in production
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60, // 1 hour
      path: '/', // Accessible across the app
    });

    console.log({
      httpOnly: true, // Prevents client-side JavaScript access
      secure: true, // Use secure in production
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60, // 1 hour
      path: '/', // Accessible across the app
    })

    return {
      access_token: accessToken,
      name: user.name,
    };
  }

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.findUserByEmail(username);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    const isPasswordMatched = await bcrypt.compare(pass, user.password);
    if (!isPasswordMatched) {
      throw new UnauthorizedException('Invalid password');
    }
    return user;
  }
}
