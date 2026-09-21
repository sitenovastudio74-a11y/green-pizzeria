import { IsUUID, IsOptional } from 'class-validator';

export class LinkAddonDto {
  @IsUUID()
  productId: string;

  @IsUUID()
  addonId: string;

  @IsOptional()
  @IsUUID()
  addonGroupId?: string;
}
