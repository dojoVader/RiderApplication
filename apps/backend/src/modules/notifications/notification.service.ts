import { Injectable, NotFoundException } from '@nestjs/common';
import { Notification, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationRequest } from '../../dtos/requests/create-notification.request';
import { UpdateNotificationRequest } from '../../dtos/requests/update-notification.request';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async create(
    createNotificationDto: CreateNotificationRequest,
  ): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        notification_type: createNotificationDto.notification_type,
        message: createNotificationDto.message,
        status: createNotificationDto.status || 'pending',
      },
    });
  }

  async findAll(): Promise<Notification[]> {
    return this.prisma.notification.findMany();
  }

  async findOne(id: number): Promise<Notification> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    return notification;
  }

  async update(
    updateNotificationDto: UpdateNotificationRequest,
  ): Promise<Notification> {
    const { id, notification_type, message, viewed, status } =
      updateNotificationDto;
    try {
      return await this.prisma.notification.update({
        where: { id },
        data: {
          notification_type,
          message,
          status,
          ...(viewed !== undefined && {
            viewed,
            viewed_at: viewed ? new Date() : null,
          }),
        },
      });
    } catch (error) {
      throw this.notFoundOr(error, id);
    }
  }

  async remove(id: number): Promise<void> {
    try {
      await this.prisma.notification.delete({ where: { id } });
    } catch (error) {
      throw this.notFoundOr(error, id);
    }
  }

  // P2025: the record to update/delete does not exist.
  private notFoundOr(error: unknown, id: number): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return new NotFoundException(`Notification with ID ${id} not found`);
    }
    return error;
  }
}
