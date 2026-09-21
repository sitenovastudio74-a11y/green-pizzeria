export interface DeliveryProviderResult {
  providerDeliveryId?: string;
  trackingUrl?: string;
}

export interface DeliveryProviderInterface {
  createDelivery(orderId: string): Promise<DeliveryProviderResult>;
}
