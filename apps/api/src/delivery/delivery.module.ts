import { Module } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { UberWebhookController } from './uber-webhook.controller';
import { ManualDeliveryProvider } from './providers/manual-delivery.provider';
import { UberDirectProvider } from './providers/uber-direct.provider';
import { BorzoProvider } from './providers/borzo.provider';
import { BorzoWebhookController } from './borzo-webhook.controller';
import { DeliveryPollingService } from './delivery-polling.service';
import { AuthModule } from '../auth/auth.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [AuthModule, OrdersModule],
  providers: [DeliveryService, ManualDeliveryProvider, UberDirectProvider, BorzoProvider, DeliveryPollingService],
  controllers: [DeliveryController, UberWebhookController, BorzoWebhookController],
  exports: [UberDirectProvider, BorzoProvider],
})
export class DeliveryModule {}
