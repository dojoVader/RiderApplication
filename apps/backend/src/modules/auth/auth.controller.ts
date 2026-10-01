import {
  Controller,
  Post,
  Get,
  Body,
  Header,
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
        body.name,
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

    const { access_token, name } = await this.authService.login(
      body.email,
      body.password,
      res,
    );
    console.log(req.cookies);
    return {
      message: 'Login successful',
      access_token,
      name,
    };
  }

  @Get('verify')
  @UseGuards(JwtGuard)
  verify(@Req() req: Request) {
    return req.user;
  }
}
