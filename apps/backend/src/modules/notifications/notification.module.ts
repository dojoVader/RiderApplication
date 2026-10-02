import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { FirebaseAdminModule } from '../firebase/firebase.module';
import { NotificationController } from './notification.controller';
import { NotificationProcessor } from './notification.processor';
import { NOTIFICATIONS_QUEUE } from './notification.queue';
import { NotificationService } from './notification.service';

@Module({
  // AuthModule exports JwtModule, which JwtGuard needs along with ConfigService.
  imports: [
    AuthModule,
    ConfigModule,
    FirebaseAdminModule,
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationProcessor],
  exports: [NotificationService],
})
export class NotificationModule {}
