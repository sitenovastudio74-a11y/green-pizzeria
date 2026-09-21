import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Unpaid orders older than this are cancelled automatically.
const MAX_AGE_MINUTES = 30;
const RUN_EVERY_MINUTES = 10;

@Injectable()
export class OrderCleanupService implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | null = null;
  private firstRun: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    this.firstRun = setTimeout(() => { void this.cancelStaleUnpaidOrders(); }, 30 * 1000);
    this.timer = setInterval(() => { void this.cancelStaleUnpaidOrders(); }, RUN_EVERY_MINUTES * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.firstRun) clearTimeout(this.firstRun);
  }

  async cancelStaleUnpaidOrders() {
    if (this.running) return;
    this.running = true;
    try {
      const unpaidStatuses = [OrderStatus.PENDING, OrderStatus.PAYMENT_PENDING];
      const cutoff = new Date(Date.now() - MAX_AGE_MINUTES * 60 * 1000);
      const stale = await this.prisma.order.findMany({
        where: { status: { in: unpaidStatuses }, createdAt: { lt: cutoff } },
        include: { payment: true },
      });
      const ids = stale
        .filter((o) => !o.payment || o.payment.status !== PaymentStatus.SUCCESS)
        .map((o) => o.id);
      if (ids.length === 0) return;
      // The status check in the where clause protects orders that got paid in the meantime.
      const result = await this.prisma.order.updateMany({
        where: { id: { in: ids }, status: { in: unpaidStatuses } },
        data: { status: OrderStatus.CANCELLED },
      });
      console.log('Order cleanup: cancelled ' + result.count + ' unpaid order(s)');
    } catch (err) {
      console.error('Order cleanup failed', err);
    } finally {
      this.running = false;
    }
  }
}
