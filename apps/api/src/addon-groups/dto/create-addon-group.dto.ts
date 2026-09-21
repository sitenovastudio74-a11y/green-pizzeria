import { IsString, IsOptional, IsInt, Min, MinLength, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAddonGroupDto {
  @IsUUID()
  productId: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minSelectable?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxSelectable?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}
