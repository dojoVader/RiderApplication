import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FirebaseModule } from 'nestjs-firebase';
import * as path from 'path';
import { FirebaseService } from './firebase.service';
import { FirebaseController } from './firebase.controller';

@Module({
  imports: [
    ConfigModule,
    FirebaseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const credPath = config.get<string>('GOOGLE_APPLICATION_CREDENTIALS');
        return {
          googleApplicationCredential: credPath
            ? path.resolve(credPath)
            : undefined,
        };
      },
    }),
  ],
  providers: [FirebaseService],
  controllers: [FirebaseController],
  exports: [FirebaseService],
})
export class FirebaseAdminModule {}
