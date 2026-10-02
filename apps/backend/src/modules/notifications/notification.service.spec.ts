import { getQueueToken } from '@nestjs/bullmq';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FirebaseService } from '../firebase/firebase.service';
import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATIONS_QUEUE } from './notification.queue';
import { NotificationService } from './notification.service';

describe('NotificationService.registerNotification', () => {
  let service: NotificationService;
  const firebase = { isValidFcmToken: jest.fn() };
  const prisma = {
    user: { updateMany: jest.fn(), update: jest.fn() },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: FirebaseService, useValue: firebase },
        { provide: PrismaService, useValue: prisma },
        {
          provide: getQueueToken(NOTIFICATIONS_QUEUE),
          useValue: { addBulk: jest.fn() },
        },
      ],
    }).compile();
    service = moduleRef.get(NotificationService);
  });

  it('saves a token that Firebase accepts on the user', async () => {
    firebase.isValidFcmToken.mockResolvedValue(true);

    await expect(
      service.registerNotification('user-1', 'tok'),
    ).resolves.toEqual({ registered: true });

    expect(firebase.isValidFcmToken).toHaveBeenCalledWith('tok');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { fcmToken: 'tok' },
    });
  });

  it('takes the token away from any other user on the same device', async () => {
    firebase.isValidFcmToken.mockResolvedValue(true);

    await service.registerNotification('user-1', 'tok');

    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { fcmToken: 'tok', NOT: { id: 'user-1' } },
      data: { fcmToken: null },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects a token Firebase says is invalid, without touching the database', async () => {
    firebase.isValidFcmToken.mockResolvedValue(false);

    await expect(
      service.registerNotification('user-1', 'bad'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('lets unexpected Firebase errors surface', async () => {
    firebase.isValidFcmToken.mockRejectedValue(
      new Error('messaging/server-unavailable'),
    );

    await expect(service.registerNotification('user-1', 'tok')).rejects.toThrow(
      'messaging/server-unavailable',
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
