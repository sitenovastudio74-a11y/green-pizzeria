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
import { DeliveryStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryService } from './delivery.service';

// Receives Uber Direct delivery-status webhooks. Uber (not a logged-in user)
// calls this, so there is no JwtAuthGuard: security comes from verifying the
// HMAC-SHA256 signature of the RAW body with UBER_WEBHOOK_SECRET.
// The raw body is enabled for this path in main.ts.
@Controller('delivery/webhook')
export class UberWebhookController {
  private readonly logger = new Logger(UberWebhookController.name);

  constructor(
    private prisma: PrismaService,
    private deliveryService: DeliveryService,
  ) {}

  private verifySignature(rawBody: string, signature?: string): boolean {
    const secret = process.env.UBER_WEBHOOK_SECRET;
    if (!secret || !signature) return false;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature.trim().toLowerCase());
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  @Post('uber')
  @HttpCode(200)
  async handle(
    @Req() req: Request,
    @Headers('x-uber-signature') uberSignature?: string,
    @Headers('x-postmates-signature') postmatesSignature?: string,
  ) {
    const body: any = (req as any).body;
    if (!Buffer.isBuffer(body)) {
      throw new BadRequestException('Raw body is not available');
    }
    const rawBody = body.toString('utf8');

    if (!this.verifySignature(rawBody, uberSignature || postmatesSignature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch (err) {
      throw new BadRequestException('Invalid JSON body');
    }

    const data: any = event.data || {};
    const kind: string = String(event.kind || event.event_type || 'unknown');
    const deliveryId: string | undefined = event.delivery_id || data.id;
    const status: string = String(event.status || data.status || '').toLowerCase();
    const eventId: string = String(
      event.id ||
        event.event_id ||
        kind + ':' + deliveryId + ':' + status + ':' + (event.created || event.event_time || ''),
    );

    const existing = await this.prisma.webhookEvent.findUnique({ where: { eventId } });
    if (existing) {
      return { received: true, duplicate: true };
    }

    let record: any;
    try {
      record = await this.prisma.webhookEvent.create({
        data: { source: 'UBER_DIRECT', eventId, eventType: kind, payload: rawBody, status: 'PENDING' },
      });
    } catch (err) {
      return { received: true, duplicate: true };
    }

    try {
      const note = await this.process(deliveryId, status, data);
      await this.prisma.webhookEvent.update({
        where: { id: record.id },
        data: { status: note ? 'FAILED' : 'PROCESSED', processedAt: new Date() },
      });
      if (note) this.logger.warn('Uber webhook not applied (' + eventId + '): ' + note);
    } catch (err: any) {
      this.logger.error('Uber webhook processing failed (' + eventId + '): ' + (err && err.message));
      await this.prisma.webhookEvent.update({
        where: { id: record.id },
        data: { status: 'FAILED', processedAt: new Date() },
      });
    }

    return { received: true };
  }

  // Returns a note when the event could not or should not be applied
  // automatically, or null when it was applied (or needed no action).
  // Delegates the actual status-mapping / multi-step-advance logic to
  // DeliveryService.applyProviderUpdate, which is shared with the polling
  // fallback (DeliveryPollingService) so both paths stay in sync.
  private async process(deliveryId: string | undefined, status: string, data: any): Promise<string | null> {
    if (!deliveryId) return 'no delivery id in the event';
    if (!status) return null; // for example courier location updates
    return this.deliveryService.applyProviderUpdate(deliveryId, status, data);
  }
}