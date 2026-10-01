import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  ParseIntPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationRequest } from '../../dtos/requests/create-notification.request';
import { UpdateNotificationRequest } from '../../dtos/requests/update-notification.request';
import { NotificationResponse } from '../../dtos/response/notification.response';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  async create(
    @Body() createNotificationDto: CreateNotificationRequest,
  ): Promise<NotificationResponse> {
    try {
      return await this.notificationService.create(createNotificationDto);
    } catch (error) {
      throw new HttpException(
        'Failed to create notification',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async findAll(): Promise<NotificationResponse[]> {
    try {
      return await this.notificationService.findAll();
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve notifications',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<NotificationResponse> {
    try {
      return await this.notificationService.findOne(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to retrieve notification',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put()
  async update(
    @Body() updateNotificationDto: UpdateNotificationRequest,
  ): Promise<NotificationResponse> {
    try {
      return await this.notificationService.update(updateNotificationDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to update notification',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    try {
      await this.notificationService.remove(id);
      return { message: 'Notification deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to delete notification',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
