import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { RegisterNotificationRequest } from '../../dtos/requests/register-notification.request';
import { Role } from '../../generated/prisma/enums';
import { JwtGuard } from '../auth/guards/jwtauth.guard';
import { NotificationService } from './notification.service';

// Shape of the JWT payload signed in AuthService.login and set on req.user by JwtGuard.
type JwtUser = { sub: string; email: string; role: Role };

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // POST /notifications/add { token }: register this device for push notifications.
  @Post('add')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtGuard)
  async add(@Body() body: RegisterNotificationRequest, @Req() req: Request) {
    const user = req.user as JwtUser;
    return this.notificationService.registerNotification(user.sub, body.token);
  }
}
