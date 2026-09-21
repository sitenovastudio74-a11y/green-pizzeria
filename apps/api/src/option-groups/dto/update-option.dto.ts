import { IsString, IsOptional, IsNumber, IsBoolean, IsInt, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateOptionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceModifier?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}
