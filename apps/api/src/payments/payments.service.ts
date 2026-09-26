import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { RazorpayProvider } from './providers/razorpay.provider';
import { TelegramService } from '../telegram/telegram.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
    private razorpayProvider: RazorpayProvider,
    private telegramService: TelegramService,
  ) {}

  async createRazorpayOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.userId !== userId) {
      throw new ForbiddenException('This order does not belong to you');
    }
    if (!order.payment) {
      throw new NotFoundException('No payment record found for this order');
    }
    if (order.payment.method !== 'ONLINE') {
      throw new BadRequestException('This order is not set up for online payment');
    }
    if (order.payment.status === PaymentStatus.SUCCESS) {
      throw new BadRequestException('This order has already been paid');
    }

    const result = await this.razorpayProvider.createOrder(
      Number(order.total),
      order.orderNumber,
    );

    await this.prisma.payment.update({
      where: { id: order.payment.id },
      data: {
        provider: 'razorpay',
        providerPaymentId: result.providerOrderId,
      },
    });

    return {
      razorpayOrderId: result.providerOrderId,
      amount: result.amount,
      currency: result.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  }

  async verifyPayment(
    userId: string,
    orderId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.userId !== userId) {
      throw new ForbiddenException('This order does not belong to you');
    }
    if (!order.payment) {
      throw new NotFoundException('No payment record found for this order');
    }

    const isValid = this.razorpayProvider.verifyPaymentSignature({
      providerOrderId: razorpayOrderId,
      providerPaymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!isValid) {
      await this.prisma.payment.update({
        where: { id: order.payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      await this.ordersService.updateStatus(orderId, OrderStatus.PAYMENT_FAILED);
      throw new BadRequestException('Payment signature verification failed');
    }

    await this.prisma.payment.update({
      where: { id: order.payment.id },
      data: {
        status: PaymentStatus.SUCCESS,
        providerPaymentId: razorpayPaymentId,
        paidAt: new Date(),
      },
    });

    await this.ordersService.updateStatus(orderId, OrderStatus.PAYMENT_SUCCESS);
    this.telegramService.sendOrderNotification(orderId).catch(() => {});
    await this.clearCartForOrder(orderId);

    return { success: true, message: 'Payment verified successfully' };
  }

  private async clearCartForOrder(orderId: string) {
    try {
      const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { userId: true } });
      if (!order || !order.userId) return;
      const cart = await this.prisma.cart.findFirst({ where: { userId: order.userId } });
      if (!cart) return;
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      await this.prisma.cartComboItem.deleteMany({ where: { cartId: cart.id } });
    } catch (err) {
      console.error('Could not clear cart after payment', err);
    }
  }

  // Called from the raw webhook route. Idempotent: safe to call even if
  // /payments/verify already marked this payment SUCCESS.
  async handleWebhook(rawBody: string, signature: string) {
    const isValid = this.razorpayProvider.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;

    if (eventType === 'payment.captured') {
      const razorpayOrderId = event.payload.payment.entity.order_id;
      const razorpayPaymentId = event.payload.payment.entity.id;

      const payment = await this.prisma.payment.findFirst({
        where: { providerPaymentId: razorpayOrderId },
      });

      if (payment && payment.status !== PaymentStatus.SUCCESS) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.SUCCESS,
            providerPaymentId: razorpayPaymentId,
            paidAt: new Date(),
          },
        });
        await this.ordersService.updateStatus(payment.orderId, OrderStatus.PAYMENT_SUCCESS);
        this.telegramService.sendOrderNotification(payment.orderId).catch(() => {});
        await this.clearCartForOrder(payment.orderId);
      }
    }

    if (eventType === 'payment.failed') {
      const razorpayOrderId = event.payload.payment.entity.order_id;

      const payment = await this.prisma.payment.findFirst({
        where: { providerPaymentId: razorpayOrderId },
      });

      if (payment && payment.status !== PaymentStatus.SUCCESS) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED },
        });
        await this.ordersService.updateStatus(payment.orderId, OrderStatus.PAYMENT_FAILED);
      }
    }

    return { received: true };
  }
}
