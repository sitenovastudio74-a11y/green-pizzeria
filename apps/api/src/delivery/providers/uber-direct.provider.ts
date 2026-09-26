import { Injectable, BadRequestException } from '@nestjs/common';
import { DeliveryProviderInterface, DeliveryProviderResult } from '../interfaces/delivery-provider.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../../orders/orders.service';

const UBER_AUTH_URL = 'https://auth.uber.com/oauth/v2/token';
const UBER_API_BASE = 'https://api.uber.com/v1/customers/';

@Injectable()
export class UberDirectProvider implements DeliveryProviderInterface {
  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
  ) {}

  private async getAccessToken(): Promise<string> {
    const response = await fetch(UBER_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.UBER_CLIENT_ID as string,
        client_secret: process.env.UBER_CLIENT_SECRET as string,
        grant_type: 'client_credentials',
        scope: 'eats.deliveries',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new BadRequestException('Uber auth failed: ' + errorText);
    }

    const data = await response.json();
    return data.access_token;
  }

  async createDelivery(orderId: string): Promise<DeliveryProviderResult> {
    const order = await this.ordersService.findOne(orderId);
    const pickupSetting = await this.prisma.setting.findUnique({
      where: { key: 'pickup_address' },
    });

    if (!pickupSetting) {
      throw new BadRequestException('pickup_address setting is not configured');
    }

    const pickup = JSON.parse(pickupSetting.value);
    const address = (order as any).address;

    if (!address) {
      throw new BadRequestException('Order has no delivery address loaded');
    }

    const accessToken = await this.getAccessToken();
    const customerId = process.env.UBER_CUSTOMER_ID;

    const pickupAddressStr = JSON.stringify({
      street_address: [pickup.street],
      city: pickup.city,
      state: pickup.state,
      zip_code: pickup.zip,
      country: 'IN',
    });

    const dropoffAddressStr = JSON.stringify({
      street_address: [address.fullAddress],
      city: address.city,
      state: address.state,
      zip_code: address.pincode,
      country: 'IN',
    });

    // Step 1: get a delivery quote (required before creating a delivery)
    const quoteResponse = await fetch(UBER_API_BASE + customerId + '/delivery_quotes', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pickup_address: pickupAddressStr,
        dropoff_address: dropoffAddressStr,
      }),
    });

    if (!quoteResponse.ok) {
      const errorText = await quoteResponse.text();
      throw new BadRequestException('Uber quote failed: ' + errorText);
    }

    const quoteData = await quoteResponse.json();
    const itemNames = order.items.map((item: any) => item.productName).join(', ');

    // Step 2: create the delivery using the quote_id
    const deliveryResponse = await fetch(UBER_API_BASE + customerId + '/deliveries', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quote_id: quoteData.id,
        pickup_address: pickupAddressStr,
        pickup_name: 'Green Pizzeria',
        pickup_phone_number: pickup.phone,
        dropoff_address: dropoffAddressStr,
        dropoff_name: (order as any).user?.name ?? 'Customer',
        dropoff_phone_number: (order as any).user?.phone ?? pickup.phone,
        manifest_items: [
          {
            name: itemNames || 'Pizza order',
            quantity: 1,
          },
        ],
        external_id: order.orderNumber,
      }),
    });

    if (!deliveryResponse.ok) {
      const errorText = await deliveryResponse.text();
      throw new BadRequestException('Uber delivery creation failed: ' + errorText);
    }

    const data = await deliveryResponse.json();

    return {
      providerDeliveryId: data.id,
      trackingUrl: data.tracking_url,
    };
  }

  // Used by the polling fallback (DeliveryService.pollProviderStatuses) as a
  // safety net for any webhook event that never arrived. Returns the same
  // shape the webhook handler works with, so both paths share one place
  // (DeliveryService.applyProviderUpdate) that turns this into a status
  // change.
  async getDeliveryStatus(providerDeliveryId: string): Promise<{ status: string; data: any }> {
    const accessToken = await this.getAccessToken();
    const customerId = process.env.UBER_CUSTOMER_ID;

    const response = await fetch(
      UBER_API_BASE + customerId + '/deliveries/' + providerDeliveryId,
      {
        method: 'GET',
        headers: { Authorization: 'Bearer ' + accessToken },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new BadRequestException('Uber status check failed: ' + errorText);
    }

    const data = await response.json();
    return { status: String(data.status || '').toLowerCase(), data };
  }
  // Returns a live delivery-price quote for a given dropoff address, without
  // creating an actual delivery. Used by checkout to show real-time pricing.
  // Returns { deliverable: false } if Uber rejects the address as out of range.
  async getQuote(dropoffAddress: {
    fullAddress: string;
    city: string;
    state: string;
    pincode: string;
  }): Promise<
    | { deliverable: true; fee: number; currency: string; quoteId: string; expiresAt: string }
    | { deliverable: false; reason: string }
  > {
    const pickupSetting = await this.prisma.setting.findUnique({
      where: { key: 'pickup_address' },
    });
    if (!pickupSetting) {
      throw new BadRequestException('pickup_address setting is not configured');
    }
    const pickup = JSON.parse(pickupSetting.value);

    const accessToken = await this.getAccessToken();
    const customerId = process.env.UBER_CUSTOMER_ID;

    const pickupAddressStr = JSON.stringify({
      street_address: [pickup.street],
      city: pickup.city,
      state: pickup.state,
      zip_code: pickup.zip,
      country: 'IN',
    });

    const dropoffAddressStr = JSON.stringify({
      street_address: [dropoffAddress.fullAddress],
      city: dropoffAddress.city,
      state: dropoffAddress.state,
      zip_code: dropoffAddress.pincode,
      country: 'IN',
    });

    const quoteResponse = await fetch(UBER_API_BASE + customerId + '/delivery_quotes', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pickup_address: pickupAddressStr,
        dropoff_address: dropoffAddressStr,
      }),
    });

    if (!quoteResponse.ok) {
      const errorData = await quoteResponse.json().catch(() => null);
      if (errorData?.code === 'address_undeliverable') {
        return { deliverable: false, reason: 'out_of_range' };
      }
      return { deliverable: false, reason: 'quote_failed' };
    }

    const quoteData = await quoteResponse.json();
    return {
      deliverable: true,
      fee: Math.round(quoteData.fee / 100),
      currency: quoteData.currency || 'INR',
      quoteId: quoteData.id,
      expiresAt: quoteData.expires,
    };
  }
}
