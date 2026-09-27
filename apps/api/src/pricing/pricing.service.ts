import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  async getSetting(key: string, fallback: number): Promise<number> {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (!setting) {
      return fallback;
    }
    const parsed = Number(setting.value);
    return isNaN(parsed) ? fallback : parsed;
  }

  // Returns the % discount that actually applies to an item, combining its
  // own override (if set) with the global default. A disabled item always
  // gets 0, regardless of the global default.
  async getEffectiveDiscountPercent(
    itemDiscountPercent: number | null | undefined,
    itemDiscountDisabled: boolean,
  ): Promise<number> {
    if (itemDiscountDisabled) {
      return 0;
    }
    if (itemDiscountPercent !== null && itemDiscountPercent !== undefined && itemDiscountPercent > 0) {
      return itemDiscountPercent;
    }
    return this.getSetting('global_discount_percent', 0);
  }

  // Applies a % discount to a price and rounds to the nearest rupee.
  applyDiscount(price: number, discountPercent: number): number {
    if (discountPercent <= 0) return price;
    return Math.round(price - (price * discountPercent) / 100);
  }
}
