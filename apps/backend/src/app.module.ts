import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';



import { FirebaseAdminModule } from './modules/firebase/firebase.module';
import { RidesModule } from './modules/rides/rides.module';
import { PrismaModule } from './modules/prisma/prisma.module';

@Module({

  imports: [
    ConfigModule.forRoot({
      envFilePath: '.development.env',
    }),

    PrismaModule,
    AuthModule,
    FirebaseAdminModule,
    RidesModule,
  ],
})
export class AppModule {}
