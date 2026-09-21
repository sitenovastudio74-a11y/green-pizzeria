import { IsString, IsOptional, IsEnum, MinLength, IsBoolean } from 'class-validator';
import { AddressLabel } from '@prisma/client';

export class CreateAddressDto {
  @IsOptional()
  @IsEnum(AddressLabel)
  label?: AddressLabel;

  @IsString()
  @MinLength(5)
  fullAddress: string;

  @IsOptional()
  @IsString()
  landmark?: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  pincode: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
