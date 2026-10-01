import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Expose } from 'class-transformer';

export class DiscountCreateRequest {
  @IsString()
  name: string;

  @IsIn(['fixed', 'percentage'])
  type: 'fixed' | 'percentage';

  @IsNumber()
  @Min(0)
  amount: number;

  @IsIn(['once', 'repeating', 'forever'])
  duration: 'once' | 'repeating' | 'forever';

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  @Expose({ name: 'extension_id' })
  extensionId?: string;

  @IsOptional()
  @IsIn(['usd', 'eur', 'gbp'])
  currency?: string;
}
