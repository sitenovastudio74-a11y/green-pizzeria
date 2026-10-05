import { IsString, IsOptional, IsIn, IsInt } from "class-validator";
import { Type } from "class-transformer";

export class CreateStoryBlockDto {
  @IsIn(["TEXT", "HEADING", "IMAGE", "LIST"])
  type: string;

  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() font?: string;
  @Type(() => Number) @IsInt() sortOrder: number;

  @IsOptional() @IsString() linkText?: string;
  @IsOptional() @IsString() linkUrl?: string;
}

export class UpdateStoryBlockDto {
  @IsOptional() @IsIn(["TEXT", "HEADING", "IMAGE", "LIST"]) type?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() font?: string;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;

  @IsOptional() @IsString() linkText?: string;
  @IsOptional() @IsString() linkUrl?: string;
}

export class ReorderStoryBlocksDto {
  @IsString({ each: true })
  orderedIds: string[];
}
