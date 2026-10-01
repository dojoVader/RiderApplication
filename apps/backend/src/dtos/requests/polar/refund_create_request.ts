import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RefundCreateRequest {
  @IsString()
  orderId: string;

  @IsString()
  extensionId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;

  @IsOptional()
  @IsIn([
    'duplicate',
    'fraudulent',
    'customer_request',
    'service_disruption',
    'satisfaction_guarantee',
    'other',
  ])
  reason?: string;
}
