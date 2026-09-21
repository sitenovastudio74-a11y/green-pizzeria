import { IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class UpdateCartItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  specialInstructions?: string;
}
