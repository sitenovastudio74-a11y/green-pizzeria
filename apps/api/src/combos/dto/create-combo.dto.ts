import { IsString, IsOptional, IsNumber, IsBoolean, IsInt, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateComboDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsNumber()
  price: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isEligibleForCoupons?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  discountPercent?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  discountDisabled?: boolean;

  // JSON-stringified array, e.g.:
  // [{ "label": "Choice of pizza (12 inches)", "selectCount": 2, "sortOrder": 0, "productIds": ["uuid1","uuid2"] }]
  @IsString()
  slots: string;
}
