import { IsString, IsOptional, IsInt } from "class-validator";
import { Type } from "class-transformer";

export class UpsertHomeSectionDto {
  @IsOptional() @IsString() tagline?: string;
  @IsOptional() @IsString() heading?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() buttonText?: string;
  @IsOptional() @IsString() buttonLink?: string;
  @IsOptional() @IsString() font?: string;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}
