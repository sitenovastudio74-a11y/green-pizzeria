import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

const NAME_RE = new RegExp('^[^/?#%]+$');
const NAME_MSG = 'Name cannot contain / ? # or %';

export class UpdateAddonGroupByNameDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @Matches(NAME_RE, { message: NAME_MSG })
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50)
  minSelectable?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  maxSelectable?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(80)
  @IsUUID('all', { each: true })
  addonIds?: string[];
}

export class ApplyAddonGroupDto {
  @IsOptional()
  @IsBoolean()
  all?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  categoryIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  productIds?: string[];
}

export class CreateAddonGroupByNameDto extends ApplyAddonGroupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @Matches(NAME_RE, { message: NAME_MSG })
  name: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50)
  minSelectable?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  maxSelectable?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(80)
  @IsUUID('all', { each: true })
  addonIds: string[];
}