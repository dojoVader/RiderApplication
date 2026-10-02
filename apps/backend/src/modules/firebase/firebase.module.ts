import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FirebaseModule } from 'nestjs-firebase';
import { FirebaseService } from './firebase.service';
import {
  decodeServiceAccount,
  FIREBASE_SERVICE_ACCOUNT,
} from './firebase-credentials';

@Module({
  imports: [
    ConfigModule,
    FirebaseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const encoded = config.get<string>(FIREBASE_SERVICE_ACCOUNT);
        return {
          googleApplicationCredential: encoded
            ? decodeServiceAccount(encoded)
            : undefined,
        };
      },
    }),
  ],
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseAdminModule {}
