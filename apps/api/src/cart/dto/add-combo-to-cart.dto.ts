import { IsUUID, IsInt, IsOptional, Min, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

class ComboSelectionInput {
  @IsUUID()
  comboSlotId: string;

  @IsUUID()
  productId: string;
}

export class AddComboToCartDto {
  @IsUUID()
  comboId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboSelectionInput)
  selections: ComboSelectionInput[];
}
