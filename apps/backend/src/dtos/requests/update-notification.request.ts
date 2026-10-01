import { IsNotEmpty, IsNumber, IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateNotificationRequest {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsOptional()
  notification_type?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsBoolean()
  @IsOptional()
  viewed?: boolean;

  @IsString()
  @IsOptional()
  status?: string;

  constructor(id: number, notification_type?: string, message?: string, viewed?: boolean, status?: string) {
    this.id = id;
    this.notification_type = notification_type;
    this.message = message;
    this.viewed = viewed;
    this.status = status;
  }
}
