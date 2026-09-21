import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { ManualDeliveryProvider } from './providers/manual-delivery.provider';
import { UberDirectProvider } from './providers/uber-direct.provider';
import { DeliveryStatus, OrderStatus } from '@prisma/client';

const DELIVERY_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  PENDING: [DeliveryStatus.CREATED],
  CREATED: [DeliveryStatus.RIDER_ASSIGNED, DeliveryStatus.CANCELLED],
  RIDER_ASSIGNED: [DeliveryStatus.PICKED_UP, DeliveryStatus.CANCELLED],
  PICKED_UP: [DeliveryStatus.OUT_FOR_DELIVERY],
  OUT_FOR_DELIVERY: [DeliveryStatus.DELIVERED, DeliveryStatus.FAILED],
  DELIVERED: [],
  FAILED: [DeliveryStatus.RIDER_ASSIGNED, DeliveryStatus.CANCELLED],
  CANCELLED: [],
};

const DELIVERY_TO_ORDER_STATUS: Partial<Record<DeliveryStatus, OrderStatus>> = {
  RIDER_ASSIGNED: OrderStatus.RIDER_ASSIGNED,
  PICKED_UP: OrderStatus.PICKED_UP,
  OUT_FOR_DELIVERY: OrderStatus.OUT_FOR_DELIVERY,
  DELIVERED: OrderStatus.DELIVERED,
  FAILED: OrderStatus.DELIVERY_FAILED,
  CANCELLED: OrderStatus.CANCELLED,
};

@Injectable()
export class DeliveryService {
  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
    private manualProvider: ManualDeliveryProvider,
    private uberProvider: UberDirectProvider,
  ) {}

  async createForOrder(orderId: string) {
    const order = await this.ordersService.findOne(orderId);

    if (order.status !== OrderStatus.READY_FOR_PICKUP) {
      throw new BadRequestException(
        'Order must be READY_FOR_PICKUP to create a delivery. Current status: ' + order.status,
      );
    }

    const existing = await this.prisma.delivery.findUnique({ where: { orderId } });
    if (existing) {
      throw new BadRequestException('A delivery already exists for this order');
    }

    const providerSetting = await this.prisma.setting.findUnique({
      where: { key: 'delivery_provider' },
    });
    const providerName = providerSetting ? providerSetting.value : 'MANUAL';

    const provider = providerName === 'UBER_DIRECT' ? this.uberProvider : this.manualProvider;
    const providerResult = await provider.createDelivery(orderId);

    const delivery = await this.prisma.delivery.create({
      data: {
        orderId,
        provider: providerName === 'UBER_DIRECT' ? 'UBER_DIRECT' : 'MANUAL',
        status: DeliveryStatus.CREATED,
        providerDeliveryId: providerResult.providerDeliveryId,
        trackingUrl: providerResult.trackingUrl,
      },
    });

    await this.ordersService.updateStatus(orderId, OrderStatus.DELIVERY_BOOKING);

    return delivery;
  }

  async findByOrder(orderId: string) {
    const delivery = await this.prisma.delivery.findUnique({ where: { orderId } });
    if (!delivery) {
      throw new NotFoundException('No delivery found for this order');
    }
    return delivery;
  }

  async findOne(id: string) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id } });
    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }
    return delivery;
  }

  async findByProviderDeliveryId(providerDeliveryId: string) {
    return this.prisma.delivery.findFirst({ where: { providerDeliveryId } });
  }

  async assignRider(deliveryId: string, courierName: string, courierPhone: string) {
    const delivery = await this.findOne(deliveryId);
    const allowed = DELIVERY_TRANSITIONS[delivery.status];

    if (!allowed.includes(DeliveryStatus.RIDER_ASSIGNED)) {
      throw new BadRequestException(
        'Cannot assign rider from delivery status ' + delivery.status,
      );
    }

    const updated = await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: { status: DeliveryStatus.RIDER_ASSIGNED, courierName, courierPhone },
    });

    await this.ordersService.updateStatus(delivery.orderId, OrderStatus.RIDER_ASSIGNED);

    return updated;
  }

  async updateStatus(deliveryId: string, newStatus: DeliveryStatus, failureReason?: string) {
    const delivery = await this.findOne(deliveryId);
    const allowed = DELIVERY_TRANSITIONS[delivery.status];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        'Cannot change delivery status from ' + delivery.status + ' to ' + newStatus,
      );
    }

    const updated = await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: newStatus,
        failureReason: failureReason ?? undefined,
        deliveredAt: newStatus === DeliveryStatus.DELIVERED ? new Date() : undefined,
      },
    });

    const mappedOrderStatus = DELIVERY_TO_ORDER_STATUS[newStatus];
    if (mappedOrderStatus) {
      await this.ordersService.updateStatus(delivery.orderId, mappedOrderStatus);
    }

    return updated;
  }

  // Shared by the Uber webhook handler AND the polling fallback, so both
  // paths turn a raw provider status string into the same sequence of
  // delivery-status transitions. Returns a note when the update could not
  // be applied automatically, or null when it was applied (or needed no
  // action).
  async applyProviderUpdate(
    providerDeliveryId: string,
    status: string,
    data: any = {},
  ): Promise<string | null> {
    if (!status) return null;
    const delivery = await this.findByProviderDeliveryId(providerDeliveryId);
    if (!delivery) return 'unknown delivery id ' + providerDeliveryId;

    const extra: any = {};
    if (data.tracking_url) extra.trackingUrl = data.tracking_url;
    const courier = data.courier;
    if (courier && courier.name) extra.courierName = courier.name;
    if (courier && (courier.phone_number || courier.phone)) {
      extra.courierPhone = courier.phone_number || courier.phone;
    }
    if (data.dropoff_eta) {
      const d = new Date(data.dropoff_eta);
      if (!isNaN(d.getTime())) extra.dropoffEta = d;
    }
    if (data.pickup_eta) {
      const d = new Date(data.pickup_eta);
      if (!isNaN(d.getTime())) extra.pickupEta = d;
    }
    if (Object.keys(extra).length > 0) {
      await this.prisma.delivery.update({ where: { id: delivery.id }, data: extra });
    }

    if (status === 'canceled' || status === 'cancelled' || status === 'returned') {
      return 'provider reported "' + status + '"; please handle this delivery manually';
    }

    const map: Record<string, DeliveryStatus> = {
      pickup: DeliveryStatus.RIDER_ASSIGNED,
      pickup_complete: DeliveryStatus.PICKED_UP,
      dropoff: DeliveryStatus.OUT_FOR_DELIVERY,
      delivered: DeliveryStatus.DELIVERED,
    };
    const target = map[status];
    if (!target) return null;

    const order: DeliveryStatus[] = [
      DeliveryStatus.CREATED,
      DeliveryStatus.RIDER_ASSIGNED,
      DeliveryStatus.PICKED_UP,
      DeliveryStatus.OUT_FOR_DELIVERY,
      DeliveryStatus.DELIVERED,
    ];
    const targetIndex = order.indexOf(target);

    for (let i = 0; i < 6; i++) {
      const fresh = await this.findOne(delivery.id);
      const currentIndex = order.indexOf(fresh.status);
      if (currentIndex < 0 || currentIndex >= targetIndex) break;
      const next = order[currentIndex + 1];
      if (next === DeliveryStatus.RIDER_ASSIGNED) {
        await this.assignRider(
          fresh.id,
          extra.courierName || fresh.courierName || 'Uber courier',
          extra.courierPhone || fresh.courierPhone || 'not provided',
        );
      } else {
        await this.updateStatus(fresh.id, next);
      }
    }
    return null;
  }

  // Polling fallback: for every non-terminal Uber Direct delivery, ask Uber
  // for its current status and apply it via applyProviderUpdate. This is a
  // safety net for any webhook event that never arrived (e.g. because the
  // local dev server has no public URL). Called on a schedule by
  // DeliveryPollingService.
  async pollProviderStatuses(uberProvider: UberDirectProvider): Promise<{ checked: number; updated: number; errors: number }> {
    const pending = await this.prisma.delivery.findMany({
      where: {
        provider: 'UBER_DIRECT',
        providerDeliveryId: { not: null },
        status: { notIn: [DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED, DeliveryStatus.FAILED] },
      },
    });

    let updated = 0;
    let errors = 0;

    for (const delivery of pending) {
      try {
        const { status, data } = await uberProvider.getDeliveryStatus(delivery.providerDeliveryId as string);
        const before = (await this.findOne(delivery.id)).status;
        await this.applyProviderUpdate(delivery.providerDeliveryId as string, status, data);
        const after = (await this.findOne(delivery.id)).status;
        if (after !== before) updated++;
      } catch (err) {
        errors++;
      }
    }

    return { checked: pending.length, updated, errors };
  }
}
