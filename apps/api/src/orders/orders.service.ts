import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, PaymentMethod } from '@prisma/client';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.PAYMENT_PENDING, OrderStatus.CANCELLED],
  PAYMENT_PENDING: [OrderStatus.PAYMENT_SUCCESS, OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED],
  PAYMENT_SUCCESS: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
  CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  PREPARING: [OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
  READY_FOR_PICKUP: [OrderStatus.DELIVERY_BOOKING, OrderStatus.CANCELLED],
  DELIVERY_BOOKING: [OrderStatus.RIDER_ASSIGNED, OrderStatus.DELIVERY_FAILED],
  RIDER_ASSIGNED: [OrderStatus.PICKED_UP, OrderStatus.DELIVERY_FAILED],
  PICKED_UP: [OrderStatus.OUT_FOR_DELIVERY],
  OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.DELIVERY_FAILED],
  DELIVERED: [],
  PAYMENT_FAILED: [],
  CANCELLED: [],
  DELIVERY_FAILED: [OrderStatus.RIDER_ASSIGNED, OrderStatus.CANCELLED],
  REFUNDED: [],
};

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async findAllAdmin(status?: OrderStatus) {
    return this.prisma.order.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        comboItems: { include: { selections: true } },
        payment: true,
        delivery: true,
        user: { select: { id: true, name: true, phone: true, email: true } },
      },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { selectedOptions: true, selectedAddons: true } },
        comboItems: { include: { selections: true } },
        payment: true,
        delivery: true,
        address: true,
        user: { select: { id: true, name: true, phone: true, email: true } },
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async findAllForUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { selectedOptions: true, selectedAddons: true } },
        comboItems: { include: { selections: true } },
        payment: true,
        delivery: true,
      },
    });
  }

  async findOneForUser(userId: string, id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { selectedOptions: true, selectedAddons: true } },
        comboItems: { include: { selections: true } },
        payment: true,
        delivery: true,
        address: true,
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.userId !== userId) {
      throw new ForbiddenException('This order does not belong to you');
    }
    return order;
  }

  async updateStatus(id: string, newStatus: OrderStatus) {
    const order = await this.findOne(id);
    let allowed = VALID_TRANSITIONS[order.status];

    // Dine-in and Takeaway orders skip the delivery-booking chain entirely,
    // so once food is ready they can go straight to DELIVERED (i.e. completed).
    // Delivery orders are untouched: they still must go through
    // DELIVERY_BOOKING -> RIDER_ASSIGNED -> ... -> DELIVERED as before.
    if (
      order.status === OrderStatus.READY_FOR_PICKUP &&
      (order.orderType === 'DINE_IN' || order.orderType === 'TAKEAWAY') &&
      !allowed.includes(OrderStatus.DELIVERED)
    ) {
      allowed = [...allowed, OrderStatus.DELIVERED];
    }

    const pickupCanComplete =
      order.status === OrderStatus.READY_FOR_PICKUP &&
      newStatus === OrderStatus.DELIVERED &&
      order.orderType !== 'DELIVERY';

    if (!allowed.includes(newStatus) && !pickupCanComplete) {
      throw new BadRequestException(
        'Cannot change order status from ' + order.status + ' to ' + newStatus,
      );
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: newStatus },
    });
  }

  async cancel(id: string) {
    const order = await this.findOne(id);
    const allowed = VALID_TRANSITIONS[order.status];

    if (!allowed.includes(OrderStatus.CANCELLED)) {
      throw new BadRequestException(
        'Order in status ' + order.status + ' cannot be cancelled',
      );
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
    });
  }

  async earnings(period: 'today' | 'week' | 'month') {
    const now = new Date();
    let startDate: Date;

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'SUCCESS',
        paidAt: { gte: startDate },
      },
    });

    const cashTotal = payments
      .filter((p) => p.method === PaymentMethod.CASH)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const onlineTotal = payments
      .filter((p) => p.method === PaymentMethod.ONLINE)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      period,
      startDate,
      totalOrders: payments.length,
      cashTotal,
      onlineTotal,
      grandTotal: cashTotal + onlineTotal,
    };
  }
}
