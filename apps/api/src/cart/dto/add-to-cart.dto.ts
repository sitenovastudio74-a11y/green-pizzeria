import { IsUUID, IsInt, IsOptional, IsString, IsArray, Min, MaxLength } from 'class-validator';

export class AddToCartDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  optionIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  addonIds?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  specialInstructions?: string;
}
