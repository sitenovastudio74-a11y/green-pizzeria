import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DeliveryService } from './delivery.service';
import { UberDirectProvider } from './providers/uber-direct.provider';

// Safety-net polling for Uber Direct deliveries. In production, Uber's
// webhooks (uber-webhook.controller.ts) are the primary way delivery status
// updates arrive - this poll only exists to catch the rare case where a
// webhook event never arrives (dropped, or - during local development -
// because localhost has no public URL for Uber to call). Every run is a
// no-op for any delivery whose status already matches what Uber reports.
@Injectable()
export class DeliveryPollingService {
  private readonly logger = new Logger(DeliveryPollingService.name);
  private running = false;

  constructor(
    private deliveryService: DeliveryService,
    private uberProvider: UberDirectProvider,
  ) {}

  @Cron('0 */2 * * * *') // every 2 minutes
  async handlePoll() {
    if (this.running) {
      this.logger.warn('Skipping poll run - previous run still in progress');
      return;
    }
    this.running = true;
    try {
      const result = await this.deliveryService.pollProviderStatuses(this.uberProvider);
      if (result.checked > 0) {
        this.logger.log(
          `Polled ${result.checked} Uber Direct deliveries: ${result.updated} updated, ${result.errors} errors`,
        );
      }
    } catch (err: any) {
      this.logger.error('Delivery poll run failed: ' + (err && err.message));
    } finally {
      this.running = false;
    }
  }
}
