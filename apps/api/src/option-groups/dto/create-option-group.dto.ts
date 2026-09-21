import { IsString, IsOptional, IsBoolean, IsInt, MinLength, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOptionGroupDto {
  @IsUUID()
  productId: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}
