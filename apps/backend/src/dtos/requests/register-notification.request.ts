import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RegisterNotificationRequest {
  // The FCM registration token from the client SDK's getToken().
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  token: string;
}
