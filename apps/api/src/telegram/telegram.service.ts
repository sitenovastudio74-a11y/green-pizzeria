import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(private prisma: PrismaService) {}

  async sendOrderNotification(orderId: string) {
    try {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (!token || !chatId) {
        this.logger.warn('Telegram not configured, skipping notification');
        return;
      }

      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: { select: { name: true, phone: true } },
          items: { select: { productName: true, quantity: true, subtotal: true } },
          comboItems: { select: { comboName: true, quantity: true, subtotal: true } },
        },
      });
      if (!order) return;

      const itemLines = order.items
        .map((i) => '- ' + i.productName + ' x' + i.quantity + ' (Rs.' + i.subtotal + ')')
        .concat(
          order.comboItems.map(
            (c) => '- [Combo] ' + c.comboName + ' x' + c.quantity + ' (Rs.' + c.subtotal + ')',
          ),
        )
        .join('\n');

      const text =
        'New Order! #' + order.orderNumber + '\n' +
        'Customer: ' + (order.user?.name || 'N/A') + ' (' + (order.user?.phone || 'N/A') + ')\n' +
        'Type: ' + order.orderType + '\n\n' +
        itemLines + '\n\n' +
        'Total: Rs.' + order.total;

      const url = 'https://api.telegram.org/bot' + token + '/sendMessage';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
      if (res.ok) {
        this.logger.log('Telegram message sent successfully');
      }
      if (!res.ok) {
        const body = await res.text();
        this.logger.error('Telegram send failed: ' + body);
      }
    } catch (err) {
      this.logger.error('Telegram notification error', err as Error);
    }
  }
}
