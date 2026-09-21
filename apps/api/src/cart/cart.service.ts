import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { AddComboToCartDto } from './dto/add-combo-to-cart.dto';
import * as crypto from 'crypto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateCart(userId: string | null, guestToken: string | null) {
    if (userId) {
      let cart = await this.prisma.cart.findFirst({ where: { userId } });
      if (!cart) {
        cart = await this.prisma.cart.create({ data: { userId } });
      }
      return cart;
    }

    if (guestToken) {
      const existing = await this.prisma.cart.findUnique({ where: { guestToken } });
      if (existing) {
        return existing;
      }
    }

    const newToken = guestToken ?? crypto.randomUUID();
    return this.prisma.cart.create({ data: { guestToken: newToken } });
  }

  async getCart(cartId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: true,
            selectedOptions: { include: { option: true } },
            selectedAddons: { include: { addon: true } },
          },
        },
        comboItems: {
          include: {
            combo: { include: { slots: true } },
            selections: true,
          },
        },
      },
    });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const items = cart.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      quantity: item.quantity,
      specialInstructions: item.specialInstructions,
      unitPrice: Number(item.priceSnapshot),
      lineTotal: Number(item.priceSnapshot) * item.quantity,
      selectedOptions: item.selectedOptions.map((o) => ({
        id: o.optionId,
        name: o.option.name,
        priceModifier: Number(o.option.priceModifier),
      })),
      selectedAddons: item.selectedAddons.map((a) => ({
        id: a.addonId,
        name: a.addon.name,
        price: Number(a.addon.price),
      })),
    }));

    const comboProductIds = Array.from(
      new Set(cart.comboItems.flatMap((ci) => ci.selections.map((s) => s.productId))),
    );
    const comboProducts = comboProductIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: comboProductIds } },
          select: { id: true, name: true },
        })
      : [];
    const productNameMap = new Map(comboProducts.map((p) => [p.id, p.name]));

    const comboItems = cart.comboItems.map((ci) => {
      const slotLabelMap = new Map(ci.combo.slots.map((s) => [s.id, s.label]));
      return {
        id: ci.id,
        comboId: ci.comboId,
        comboName: ci.combo.name,
        quantity: ci.quantity,
        unitPrice: Number(ci.priceSnapshot),
        lineTotal: Number(ci.priceSnapshot) * ci.quantity,
        selections: ci.selections.map((s) => ({
          slotLabel: slotLabelMap.get(s.comboSlotId) || '',
          productId: s.productId,
          productName: productNameMap.get(s.productId) || '',
        })),
      };
    });

    const subtotal =
      items.reduce((sum, i) => sum + i.lineTotal, 0) +
      comboItems.reduce((sum, i) => sum + i.lineTotal, 0);

    return { id: cart.id, items, comboItems, subtotal };
  }

  async addItem(cartId: string, dto: AddToCartDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: {
        optionGroups: { include: { options: true } },
        addons: { include: { addon: true } },
        addonGroups: { include: { productAddons: true } },
      },
    });

    if (!product || !product.isAvailable) {
      throw new NotFoundException('Product not found or unavailable');
    }

    const quantity = dto.quantity ?? 1;
    const optionIds = dto.optionIds ?? [];
    const addonIds = dto.addonIds ?? [];

    // Validate every requested option actually belongs to this product
    const validOptionIds = new Set(
      product.optionGroups.flatMap((g) => g.options.map((o) => o.id)),
    );
    for (const id of optionIds) {
      if (!validOptionIds.has(id)) {
        throw new BadRequestException('Invalid option for this product: ' + id);
      }
    }

    // Validate every required option group has a selection
    for (const group of product.optionGroups) {
      if (group.isRequired) {
        const groupOptionIds = group.options.map((o) => o.id);
        const hasSelection = optionIds.some((id) => groupOptionIds.includes(id));
        if (!hasSelection) {
          throw new BadRequestException('Missing required selection for group: ' + group.name);
        }
      }
    }

    // Validate every requested addon is actually linked to this product
    const validAddonIds = new Set(product.addons.map((pa) => pa.addonId));
    for (const id of addonIds) {
      if (!validAddonIds.has(id)) {
        throw new BadRequestException('Invalid addon for this product: ' + id);
      }
    }

    // Validate addon-group selection limits (e.g. "Add Your Drinks - select up to 3")
    // and minimum-required counts (e.g. "select at least 1").
    for (const group of product.addonGroups) {
      const groupAddonIds = new Set(group.productAddons.map((pa) => pa.addonId));
      const selectedInGroup = addonIds.filter((id) => groupAddonIds.has(id));

      if (selectedInGroup.length > group.maxSelectable) {
        throw new BadRequestException(
          'You can select at most ' + group.maxSelectable + ' item(s) for "' + group.name + '"',
        );
      }
      if (selectedInGroup.length < group.minSelectable) {
        throw new BadRequestException(
          'Please select at least ' + group.minSelectable + ' item(s) for "' + group.name + '"',
        );
      }
    }

    // Server-side price calculation (never trust frontend price)
    const selectedOptions = await this.prisma.option.findMany({
      where: { id: { in: optionIds } },
    });
    const selectedAddons = await this.prisma.addon.findMany({
      where: { id: { in: addonIds } },
    });

    let unitPrice = Number(product.basePrice);
    for (const opt of selectedOptions) {
      unitPrice += Number(opt.priceModifier);
    }
    for (const addon of selectedAddons) {
      unitPrice += Number(addon.price);
    }

    const cartItem = await this.prisma.cartItem.create({
      data: {
        cartId,
        productId: dto.productId,
        quantity,
        specialInstructions: dto.specialInstructions,
        priceSnapshot: unitPrice,
        selectedOptions: {
          create: optionIds.map((id) => ({ optionId: id })),
        },
        selectedAddons: {
          create: addonIds.map((id) => ({ addonId: id })),
        },
      },
    });

    return this.getCart(cartId);
  }

  async updateItem(cartId: string, itemId: string, dto: UpdateCartItemDto) {
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId } });
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: {
        quantity: dto.quantity,
        specialInstructions: dto.specialInstructions,
      },
    });

    return this.getCart(cartId);
  }

  async removeItem(cartId: string, itemId: string) {
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId } });
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });

    return this.getCart(cartId);
  }

  async addComboItem(cartId: string, dto: AddComboToCartDto) {
    const combo = await this.prisma.combo.findUnique({
      where: { id: dto.comboId },
      include: { slots: { include: { eligibleProducts: true } } },
    });

    if (!combo || !combo.isActive) {
      throw new NotFoundException('Combo not found or unavailable');
    }

    const quantity = dto.quantity ?? 1;

    for (const slot of combo.slots) {
      const slotSelections = dto.selections.filter((s) => s.comboSlotId === slot.id);

      if (slotSelections.length !== slot.selectCount) {
        throw new BadRequestException(
          'Please select exactly ' + slot.selectCount + ' item(s) for "' + slot.label + '"',
        );
      }

      const eligibleIds = new Set(slot.eligibleProducts.map((ep) => ep.productId));
      for (const sel of slotSelections) {
        if (!eligibleIds.has(sel.productId)) {
          throw new BadRequestException(
            'Invalid product selection for "' + slot.label + '"',
          );
        }
      }
    }

    const validSlotIds = new Set(combo.slots.map((s) => s.id));
    for (const sel of dto.selections) {
      if (!validSlotIds.has(sel.comboSlotId)) {
        throw new BadRequestException('Invalid slot for this combo');
      }
    }

    await this.prisma.cartComboItem.create({
      data: {
        cartId,
        comboId: combo.id,
        quantity,
        priceSnapshot: combo.price,
        selections: {
          create: dto.selections.map((s) => ({
            comboSlotId: s.comboSlotId,
            productId: s.productId,
          })),
        },
      },
    });

    return this.getCart(cartId);
  }

  async updateComboItem(cartId: string, itemId: string, quantity: number) {
    const item = await this.prisma.cartComboItem.findFirst({ where: { id: itemId, cartId } });
    if (!item) {
      throw new NotFoundException('Combo cart item not found');
    }

    await this.prisma.cartComboItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    return this.getCart(cartId);
  }

  async removeComboItem(cartId: string, itemId: string) {
    const item = await this.prisma.cartComboItem.findFirst({ where: { id: itemId, cartId } });
    if (!item) {
      throw new NotFoundException('Combo cart item not found');
    }

    await this.prisma.cartComboItem.delete({ where: { id: itemId } });

    return this.getCart(cartId);
  }
}
