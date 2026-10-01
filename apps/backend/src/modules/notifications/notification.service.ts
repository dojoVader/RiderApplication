import { Injectable, NotImplementedException } from '@nestjs/common';
import { CreateNotificationRequest } from '../../dtos/requests/create-notification.request';
import { UpdateNotificationRequest } from '../../dtos/requests/update-notification.request';
import { NotificationResponse } from '../../dtos/response/notification.response';

// TODO: wire up a persistence layer for notifications.
@Injectable()
export class NotificationService {
  async create(
    _createNotificationDto: CreateNotificationRequest,
  ): Promise<NotificationResponse> {
    throw new NotImplementedException('Persistence layer removed');
  }

  async findAll(): Promise<NotificationResponse[]> {
    throw new NotImplementedException('Persistence layer removed');
  }

  async findOne(_id: number): Promise<NotificationResponse> {
    throw new NotImplementedException('Persistence layer removed');
  }

  async update(
    _updateNotificationDto: UpdateNotificationRequest,
  ): Promise<NotificationResponse> {
    throw new NotImplementedException('Persistence layer removed');
  }

  async remove(_id: number): Promise<void> {
    throw new NotImplementedException('Persistence layer removed');
  }
}
