import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCartComboItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}
