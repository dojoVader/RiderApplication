import {
  Controller,
  Post,
  Get,
  Body,
  Header,
  HttpCode,
  HttpException,
  HttpStatus,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginRequest } from '../../dtos/requests/login.request';
import { RegisterRequest } from '../../dtos/requests/register.request';
import { JwtGuard } from './guards/jwtauth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @Header('accept', 'application/json')
  @Header('Content-Type', 'application/json')
  async register(@Body() body: RegisterRequest) {
    if (body?.email && body?.password) {
      return this.authService.register(
        body.email,
        body.password,
        body.role,
      );
    } else {
      throw new HttpException(
        'All fields are required',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('login')
  @Header('accept', 'application/json')
  @Header('Content-Type', 'application/json')
  async login(
    @Body() body: LoginRequest,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {

    const { access_token, role } = await this.authService.login(
      body.email,
      body.password,
      res,
    );
    return {
      message: 'Login successful',
      access_token,
      role,
    };
  }

  // No guard: clearing the cookie is harmless, and an expired session should still be able to log out.
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response) {
    this.authService.logout(res);
  }

  @Get('me')
  @UseGuards(JwtGuard)
  verify(@Req() req: Request) {
    return req.user;
  }
}
