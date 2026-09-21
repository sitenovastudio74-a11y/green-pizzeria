import { IsString, IsOptional, IsNumber, IsBoolean, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAddonDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isAvailable?: boolean;
}
