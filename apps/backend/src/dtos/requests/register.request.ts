import { IsIn, IsOptional } from 'class-validator';
import { LoginRequest } from './login.request';
import { Role } from '../../generated/prisma/client';

export class RegisterRequest extends LoginRequest {
  // Admins can't be self-registered.
  @IsIn([Role.RIDER, Role.DRIVER])
  @IsOptional()
  role?: Role;
}
