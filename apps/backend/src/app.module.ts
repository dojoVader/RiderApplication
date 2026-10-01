import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';

import { NotificationModule } from './modules/notifications/notification.module';


import { FirebaseAdminModule } from './modules/firebase/firebase.module';
import { RidesModule } from './modules/rides/rides.module';

@Module({

  imports: [
    ConfigModule.forRoot({
      envFilePath: '.development.env',
    }),

    AuthModule,
    NotificationModule,
    FirebaseAdminModule,
    RidesModule,
  ],
})
export class AppModule {}
