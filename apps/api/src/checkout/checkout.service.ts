import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { OrderType } from '@prisma/client';
import * as crypto from 'crypto';
import { UberDirectProvider } from '../delivery/providers/uber-direct.provider';
import { BorzoProvider } from '../delivery/providers/borzo.provider';
import { PricingService } from '../pricing/pricing.service';

@Injectable()
export class CheckoutService {
  constructor(
    private prisma: PrismaService,
    private uberDirectProvider: UberDirectProvider,
    private borzoProvider: BorzoProvider,
    private pricingService: PricingService,
  ) {}

  private async getSetting(key: string, fallback: number) {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (!setting) {
      return fallback;
    }
    const parsed = Number(setting.value);
    return isNaN(parsed) ? fallback : parsed;
  }

  async getDeliveryQuote(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) {
      throw new NotFoundException('Address not found');
    }

    const providerSetting = await this.prisma.setting.findUnique({ where: { key: 'delivery_provider' } });
    const useBorzo = !!providerSetting && providerSetting.value === 'BORZO';
    const quoteProvider: any = useBorzo ? this.borzoProvider : this.uberDirectProvider;
    const result = await quoteProvider.getQuote({
      fullAddress: address.fullAddress,
      latitude: address.latitude,
      longitude: address.longitude,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
    });

    if (!result.deliverable) {
      return { deliverable: false, message: useBorzo ? 'Sorry, we only deliver within ' + (process.env.BORZO_MAX_KM || '24') + ' km of our store.' : 'Sorry, we only deliver within 16 km of our store.' };
    }

    return {
      deliverable: true,
      fee: result.fee,
      currency: result.currency,
      quoteId: result.quoteId,
      expiresAt: result.expiresAt,
    };
  }

  async checkout(userId: string, dto: CreateCheckoutDto) {
    // Client requirement: only online payment is accepted.
    if (String(dto.paymentMethod) !== 'ONLINE') {
      throw new BadRequestException('Only online payment is accepted');
    }

    const cart = await this.prisma.cart.findFirst({
      where: { userId },
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

    if (!cart || (cart.items.length === 0 && cart.comboItems.length === 0)) {
      throw new BadRequestException('Cart is empty');
    }

    let address: any = null;
    let deliveryAddressText: string | null = null;

    if (dto.orderType === OrderType.DELIVERY) {
      if (!dto.addressId) {
        throw new BadRequestException('addressId is required for delivery orders');
      }
      const phoneProvider = await this.prisma.setting.findUnique({ where: { key: 'delivery_provider' } });
      if (phoneProvider && phoneProvider.value === 'BORZO') {
        const phoneUser = await this.prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
        const phoneDigits = String((phoneUser && phoneUser.phone) || '').replace(/\D/g, '');
        const phoneOk = phoneDigits.length === 10 || (phoneDigits.length === 11 && phoneDigits.startsWith('0')) || (phoneDigits.length === 12 && phoneDigits.startsWith('91'));
        if (!phoneOk) {
          throw new BadRequestException('Please add a valid 10-digit phone number in your account (Account > Edit profile) before ordering delivery.');
        }
      }
      address = await this.prisma.address.findFirst({
        where: { id: dto.addressId, userId },
      });
      if (!address) {
        throw new NotFoundException('Address not found');
      }
      deliveryAddressText =
        address.fullAddress + ', ' + address.city + ', ' + address.state + ', ' + address.pincode;
    }

    // Re-validate and re-price every item fresh from the database.
    // Never trust the cart's stored snapshot at checkout time - prices
    // may have changed since the item was added to cart.
    const orderItemsData: any[] = [];
    let subtotal = 0;

    for (const item of cart.items) {
      if (!item.product.isAvailable) {
        throw new BadRequestException(
          item.product.name + ' is no longer available',
        );
      }

      const itemDiscountPercent = await this.pricingService.getEffectiveDiscountPercent(
        item.product.discountPercent,
        item.product.discountDisabled,
      );
      let unitPrice = this.pricingService.applyDiscount(Number(item.product.basePrice), itemDiscountPercent);
      const optionSnapshots = item.selectedOptions.map((so) => {
        unitPrice += Number(so.option.priceModifier);
        return {
          optionId: so.optionId,
          optionName: so.option.name,
          priceModifier: so.option.priceModifier,
        };
      });
      const addonSnapshots = item.selectedAddons.map((sa) => {
        unitPrice += Number(sa.addon.price) * sa.quantity;
        return {
          addonId: sa.addonId,
          addonName: sa.addon.name,
          price: sa.addon.price,
          quantity: sa.quantity,
        };
      });

      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;

      orderItemsData.push({
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice,
        subtotal: lineTotal,
        specialInstructions: item.specialInstructions,
        optionSnapshots,
        addonSnapshots,
      });
    }

    // Re-validate and re-price every combo item fresh from the database too.
    const orderComboItemsData: any[] = [];

    for (const comboItem of cart.comboItems) {
      if (!comboItem.combo.isActive) {
        throw new BadRequestException(
          comboItem.combo.name + ' is no longer available',
        );
      }

      const comboDiscountPercent = await this.pricingService.getEffectiveDiscountPercent(
        comboItem.combo.discountPercent,
        comboItem.combo.discountDisabled,
      );
      const unitPrice = this.pricingService.applyDiscount(Number(comboItem.combo.price), comboDiscountPercent);
      const lineTotal = unitPrice * comboItem.quantity;
      subtotal += lineTotal;

      const slotLabelMap = new Map(
        comboItem.combo.slots.map((s) => [s.id, s.label]),
      );
      const productIds = comboItem.selections.map((s) => s.productId);
      const products = productIds.length
        ? await this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true },
          })
        : [];
      const productNameMap = new Map(products.map((p) => [p.id, p.name]));

      orderComboItemsData.push({
        comboId: comboItem.comboId,
        comboName: comboItem.combo.name,
        quantity: comboItem.quantity,
        unitPrice,
        subtotal: lineTotal,
        selections: comboItem.selections.map((s) => ({
          slotLabel: slotLabelMap.get(s.comboSlotId) || '',
          productId: s.productId,
          productName: productNameMap.get(s.productId) || '',
        })),
      });
    }

    // Delivery fee only applies to delivery orders. Takeaway and dine-in skip it.
    let deliveryFee = 0;
    if (dto.orderType === OrderType.DELIVERY) {
      const providerSetting = await this.prisma.setting.findUnique({ where: { key: 'delivery_provider' } });
      if (providerSetting && providerSetting.value === 'BORZO') {
        // Price delivery on the server from a fresh Borzo quote. Never trust the amount the browser shows.
        const quote: any = await this.getDeliveryQuote(userId, dto.addressId as string);
        if (!quote.deliverable) {
          throw new BadRequestException(quote.message || 'Delivery is not available to this address');
        }
        deliveryFee = Number(quote.fee);
      } else {
        deliveryFee = await this.getSetting('delivery_fee', 40);
      }
    }
    const taxRatePercent = await this.getSetting('tax_rate_percent', 5);
    const tax = Math.round((subtotal * taxRatePercent) / 100);
    const total = subtotal + deliveryFee + tax;

    const orderNumber = 'GP' + Math.floor(1000 + Math.random() * 9000);

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          orderType: dto.orderType,
          addressId: address ? address.id : null,
          deliveryAddressText,
          subtotal,
          deliveryFee,
          tax,
          discount: 0,
          total,
          status: 'PAYMENT_PENDING',
          specialInstructions: dto.specialInstructions,
        },
      });

      for (const itemData of orderItemsData) {
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: itemData.productId,
            productName: itemData.productName,
            quantity: itemData.quantity,
            unitPrice: itemData.unitPrice,
            subtotal: itemData.subtotal,
            specialInstructions: itemData.specialInstructions,
          },
        });

        for (const opt of itemData.optionSnapshots) {
          await tx.orderItemOption.create({
            data: {
              orderItemId: orderItem.id,
              optionId: opt.optionId,
              optionName: opt.optionName,
              priceModifier: opt.priceModifier,
            },
          });
        }

        for (const addon of itemData.addonSnapshots) {
          await tx.orderItemAddon.create({
            data: {
              orderItemId: orderItem.id,
              addonId: addon.addonId,
              addonName: addon.addonName,
              price: addon.price,
              quantity: addon.quantity,
            },
          });
        }
      }

      for (const comboData of orderComboItemsData) {
        const orderComboItem = await tx.orderComboItem.create({
          data: {
            orderId: newOrder.id,
            comboId: comboData.comboId,
            comboName: comboData.comboName,
            quantity: comboData.quantity,
            unitPrice: comboData.unitPrice,
            subtotal: comboData.subtotal,
          },
        });

        for (const sel of comboData.selections) {
          await tx.orderComboSelection.create({
            data: {
              orderComboItemId: orderComboItem.id,
              slotLabel: sel.slotLabel,
              productId: sel.productId,
              productName: sel.productName,
            },
          });
        }
      }

      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          method: dto.paymentMethod,
          status: 'PENDING',
          amount: total,
          idempotencyKey: crypto.randomUUID(),
        },
      });

      // ONLINE: cart is cleared later, after payment is confirmed (payments.service.ts).
      if (String(dto.paymentMethod) !== 'ONLINE') {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        await tx.cartComboItem.deleteMany({ where: { cartId: cart.id } });
      }

      return newOrder;
    });

    return order;
  }
}
