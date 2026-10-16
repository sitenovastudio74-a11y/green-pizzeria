import { IsString, IsInt, Min, Max, IsOptional, IsBoolean, IsNumber, IsDateString, MaxLength, MinLength } from 'class-validator';

export class CreateCouponDto {
  @IsString() @MinLength(3) @MaxLength(30)
  code: string;

  @IsInt() @Min(1) @Max(100)
  percentOff: number;

  @IsOptional() @IsNumber() @Min(0)
  maxDiscount?: number | null;

  @IsOptional() @IsNumber() @Min(0)
  minOrder?: number | null;

  @IsOptional() @IsDateString()
  expiresAt?: string | null;

  @IsOptional() @IsInt() @Min(1)
  usageLimit?: number | null;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class UpdateCouponDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(30)
  code?: string;

  @IsOptional() @IsInt() @Min(1) @Max(100)
  percentOff?: number;

  @IsOptional() @IsNumber() @Min(0)
  maxDiscount?: number | null;

  @IsOptional() @IsNumber() @Min(0)
  minOrder?: number | null;

  @IsOptional() @IsDateString()
  expiresAt?: string | null;

  @IsOptional() @IsInt() @Min(1)
  usageLimit?: number | null;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class ValidateCouponDto {
  @IsString() @MaxLength(40)
  code: string;

  @IsOptional() @IsNumber() @Min(0)
  subtotal?: number;
}
