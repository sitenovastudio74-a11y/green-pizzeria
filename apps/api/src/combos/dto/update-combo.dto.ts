import { IsString, IsOptional, IsNumber, IsBoolean, IsInt, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateComboDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;

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
  @IsString()
  slots?: string;
}
