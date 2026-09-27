import { PricingService } from '../pricing/pricing.service';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComboDto } from './dto/create-combo.dto';
import { UpdateComboDto } from './dto/update-combo.dto';

type ParsedSlot = {
  label: string;
  selectCount?: number;
  sortOrder?: number;
  productIds: string[];
};

@Injectable()
export class CombosService {
  constructor(private prisma: PrismaService, private pricing: PricingService) {}

  private async withComboDiscount<T extends { price: any; discountPercent: number | null; discountDisabled: boolean }>(item: T) {
    const effectiveDiscountPercent = await this.pricing.getEffectiveDiscountPercent(item.discountPercent, item.discountDisabled);
    const originalPrice = Number(item.price);
    const finalPrice = this.pricing.applyDiscount(originalPrice, effectiveDiscountPercent);
    return { ...item, effectiveDiscountPercent, originalPrice, finalPrice };
  }

  private parseSlots(slotsJson: string): ParsedSlot[] {
    let parsed: any;
    try {
      parsed = JSON.parse(slotsJson);
    } catch {
      throw new BadRequestException('slots must be valid JSON');
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new BadRequestException('slots must be a non-empty array');
    }
    for (const slot of parsed) {
      if (!slot.label || !Array.isArray(slot.productIds) || slot.productIds.length === 0) {
        throw new BadRequestException(
          'Each slot needs a label and at least one productId',
        );
      }
    }
    return parsed;
  }

  private comboInclude = {
    slots: {
      orderBy: { sortOrder: 'asc' as const },
      include: {
        eligibleProducts: {
          include: {
            product: {
              select: { id: true, name: true, imageUrl: true, basePrice: true },
            },
          },
        },
      },
    },
  };

  async findAllPublic() {
    const combos = await this.prisma.combo.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: this.comboInclude,
    });
    return Promise.all(combos.map((c) => this.withComboDiscount(c)));
  }

  async findAllAdmin() {
    return this.prisma.combo.findMany({
      orderBy: { sortOrder: 'asc' },
      include: this.comboInclude,
    });
  }

  async findOne(id: string) {
    const combo = await this.prisma.combo.findUnique({
      where: { id },
      include: this.comboInclude,
    });
    if (!combo) {
      throw new NotFoundException('Combo not found');
    }
    return this.withComboDiscount(combo);
  }

  async create(dto: CreateComboDto, imageUrl?: string) {
    const slots = this.parseSlots(dto.slots);

    const combo = await this.prisma.$transaction(async (tx) => {
      const created = await tx.combo.create({
        data: {
          name: dto.name,
          description: dto.description,
          price: dto.price,
          isEligibleForCoupons: dto.isEligibleForCoupons ?? false,
          isActive: dto.isActive ?? true,
          sortOrder: dto.sortOrder ?? 0,
          imageUrl,
          discountPercent: dto.discountPercent ?? 0,
          discountDisabled: dto.discountDisabled ?? false,
        },
      });

      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const createdSlot = await tx.comboSlot.create({
          data: {
            comboId: created.id,
            label: slot.label,
            selectCount: slot.selectCount ?? 1,
            sortOrder: slot.sortOrder ?? i,
          },
        });

        for (const productId of slot.productIds) {
          await tx.comboSlotProduct.create({
            data: { comboSlotId: createdSlot.id, productId },
          });
        }
      }

      return created;
    });

    return this.findOne(combo.id);
  }

  async update(id: string, dto: UpdateComboDto, imageUrl?: string) {
    await this.findOne(id);

    const baseData = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.price !== undefined && { price: dto.price }),
      ...(dto.isEligibleForCoupons !== undefined && {
        isEligibleForCoupons: dto.isEligibleForCoupons,
      }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      ...(dto.discountPercent !== undefined && { discountPercent: dto.discountPercent }),
      ...(dto.discountDisabled !== undefined && { discountDisabled: dto.discountDisabled }),
      ...(imageUrl && { imageUrl }),
    };

    if (dto.slots) {
      const slots = this.parseSlots(dto.slots);

      await this.prisma.$transaction(async (tx) => {
        await tx.combo.update({ where: { id }, data: baseData });

        // Replace all slots wholesale - simplest correct approach for admin edits
        await tx.comboSlot.deleteMany({ where: { comboId: id } });

        for (let i = 0; i < slots.length; i++) {
          const slot = slots[i];
          const createdSlot = await tx.comboSlot.create({
            data: {
              comboId: id,
              label: slot.label,
              selectCount: slot.selectCount ?? 1,
              sortOrder: slot.sortOrder ?? i,
            },
          });

          for (const productId of slot.productIds) {
            await tx.comboSlotProduct.create({
              data: { comboSlotId: createdSlot.id, productId },
            });
          }
        }
      });
    } else {
      await this.prisma.combo.update({ where: { id }, data: baseData });
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.combo.delete({ where: { id } });
  }
}
