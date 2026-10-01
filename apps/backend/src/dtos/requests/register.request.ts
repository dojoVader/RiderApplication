import { IsOptional, IsString } from 'class-validator';
import { LoginRequest } from './login.request';

export class RegisterRequest extends LoginRequest {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  role?: string;
}
