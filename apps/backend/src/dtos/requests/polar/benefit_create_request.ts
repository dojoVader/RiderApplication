import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BenefitCreateRequest {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsString()
  extensionId: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  activationLimit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  usageLimit?: number;
}
