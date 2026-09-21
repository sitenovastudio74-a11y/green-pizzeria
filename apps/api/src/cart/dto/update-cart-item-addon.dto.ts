import { IsInt, Min, Max } from 'class-validator';

export class UpdateCartItemAddonDto {
  @IsInt()
  @Min(0)
  @Max(20)
  quantity: number;
}