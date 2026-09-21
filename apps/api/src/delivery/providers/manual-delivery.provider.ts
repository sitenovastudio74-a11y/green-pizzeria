import { Injectable } from '@nestjs/common';
import { DeliveryProviderInterface, DeliveryProviderResult } from '../interfaces/delivery-provider.interface';

@Injectable()
export class ManualDeliveryProvider implements DeliveryProviderInterface {
  async createDelivery(orderId: string): Promise<DeliveryProviderResult> {
    return {
      providerDeliveryId: undefined,
      trackingUrl: undefined,
    };
  }
}
