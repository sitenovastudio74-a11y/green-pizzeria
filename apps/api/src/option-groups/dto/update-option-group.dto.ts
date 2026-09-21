import { IsString, IsOptional, IsBoolean, IsInt, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateOptionGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}
