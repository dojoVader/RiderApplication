import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ProductCreateRequest {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  extensionId: string;

  @IsIn(['fixed', 'free'])
  amountType: 'fixed' | 'free';

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceAmount?: number;

  @IsOptional()
  @IsIn(['usd', 'eur', 'gbp'])
  priceCurrency?: string;

  @IsIn(['one_time', 'recurring'])
  priceType: 'one_time' | 'recurring';

  @IsOptional()
  @IsIn(['month', 'year'])
  recurringInterval?: 'month' | 'year';
}
