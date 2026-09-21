import { IsString, IsOptional, IsEnum, MinLength, IsBoolean } from 'class-validator';
import { AddressLabel } from '@prisma/client';

export class UpdateAddressDto {
  @IsOptional()
  @IsEnum(AddressLabel)
  label?: AddressLabel;

  @IsOptional()
  @IsString()
  @MinLength(5)
  fullAddress?: string;

  @IsOptional()
  @IsString()
  landmark?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
