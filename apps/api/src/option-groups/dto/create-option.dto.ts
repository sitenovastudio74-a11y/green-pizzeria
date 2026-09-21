import { IsString, IsOptional, IsNumber, IsBoolean, IsInt, MinLength, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOptionDto {
  @IsUUID()
  optionGroupId: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceModifier?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}
