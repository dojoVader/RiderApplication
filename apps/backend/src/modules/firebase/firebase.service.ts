import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FirebaseAdmin, InjectFirebaseAdmin } from 'nestjs-firebase';
import { FirebaseCustomerCollections } from '../../dtos/firebase/collections/FirebaseCustomerCollections';
import {
  decodeServiceAccount,
  FIREBASE_SERVICE_ACCOUNT,
  ServiceAccount,
} from './firebase-credentials';

@Injectable()
export class FirebaseService {
  constructor(
    private readonly config: ConfigService,
    @InjectFirebaseAdmin() private readonly firebase: FirebaseAdmin,
  ) {}
}
