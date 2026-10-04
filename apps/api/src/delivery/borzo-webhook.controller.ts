import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryService } from './delivery.service';
import { BorzoProvider } from './providers/borzo.provider';

// Receives Borzo order/delivery callbacks. Security: HMAC-SHA256 of the RAW
// body with BORZO_CALLBACK_SECRET, compared to the X-DV-Signature header.
// The raw body is enabled for this path in main.ts. Polling in
// DeliveryPollingService is the safety net if a callback is rejected or lost.
@Controller('delivery/webhook')
export class BorzoWebhookController {
  private readonly logger = new Logger(BorzoWebhookController.name);

  constructor(
    private prisma: PrismaService,
    private deliveryService: DeliveryService,
    private borzoProvider: BorzoProvider,
  ) {}

  private verifySignature(rawBody: string, signature?: string): boolean {
    const secret = process.env.BORZO_CALLBACK_SECRET;
    if (!secret || !signature) return false;
    const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature.trim().toLowerCase());
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  @Post('borzo')
  @HttpCode(200)
  async handle(@Req() req: Request, @Headers('x-dv-signature') signature?: string) {
    const body: any = (req as any).body;
    if (!Buffer.isBuffer(body)) throw new BadRequestException('Raw body is not available');
    const rawBody = body.toString('utf8');

    if (!this.verifySignature(rawBody, signature)) {
      this.logger.warn('Borzo callback rejected: signature mismatch (polling will still pick the status up)');
      throw new UnauthorizedException('Invalid callback signature');
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch (err) {
      throw new BadRequestException('Invalid JSON body');
    }

    const order: any = event.order;
    const delivery: any = event.delivery;
    const orderId = (order && order.order_id) || (delivery && delivery.order_id);
    const kind = String(event.event_type || (order ? 'order_changed' : 'delivery_changed'));
    const rawStatus = String((order && order.status) || (delivery && delivery.status) || '').toLowerCase();
    const eventId = kind + ':' + orderId + ':' + rawStatus + ':' + String(event.event_datetime || '');

    const existing = await this.prisma.webhookEvent.findUnique({ where: { eventId } });
    if (existing) return { received: true, duplicate: true };

    let record: any;
    try {
      record = await this.prisma.webhookEvent.create({
        data: { source: 'BORZO', eventId, eventType: kind, payload: rawBody, status: 'PENDING' },
      });
    } catch (err) {
      return { received: true, duplicate: true };
    }

    try {
      this.logger.log('Borzo callback: order ' + orderId + ' raw status=[' + rawStatus + ']');
      const note = await this.process(orderId, order, delivery);
      this.logger.log('Borzo callback result note=' + String(note));
      await this.prisma.webhookEvent.update({
        where: { id: record.id },
        data: { status: note ? 'FAILED' : 'PROCESSED', processedAt: new Date() },
      });
      if (note) this.logger.warn('Borzo callback not applied (' + eventId + '): ' + note);
    } catch (err: any) {
      this.logger.error('Borzo callback processing failed (' + eventId + '): ' + (err && err.message));
      await this.prisma.webhookEvent.update({
        where: { id: record.id },
        data: { status: 'FAILED', processedAt: new Date() },
      });
    }
    return { received: true };
  }

  private async process(orderId: any, order: any, delivery: any): Promise<string | null> {
    if (!orderId) return 'no order id in the callback';
    let status = '';
    let data: any = {};
    if (order) {
      const n = this.borzoProvider.normalizeOrder(order);
      status = n.status;
      data = n.data;
    } else if (delivery) {
      const s = String(delivery.status || '').toLowerCase();
      if (s === 'finished') status = 'delivered';
      else if (s === 'canceled' || s === 'cancelled') status = 'canceled';
    }
    this.logger.log('Borzo mapped status=[' + status + ']'); if (!status) return null;
    return this.deliveryService.applyProviderUpdate(String(orderId), status, data);
  }
}