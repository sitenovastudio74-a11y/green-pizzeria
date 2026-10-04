import { Injectable, BadRequestException } from '@nestjs/common';
import { DeliveryProviderInterface, DeliveryProviderResult } from '../interfaces/delivery-provider.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../../orders/orders.service';

// Defaults to the Borzo TEST environment so nothing real is booked unless
// BORZO_API_URL is explicitly set to the production URL.
const DEFAULT_BORZO_URL = 'https://robotapitest-in.borzodelivery.com/api/business/1.8';

// Borzo wants timestamps like 2026-10-03T22:39:33+05:30 (IST).
function istStamp(minutesFromNow: number): string {
  const d = new Date(Date.now() + minutesFromNow * 60000 + 330 * 60000);
  return d.toISOString().slice(0, 19) + '+05:30';
}

// Borzo wants phone numbers as 91XXXXXXXXXX.
function toBorzoPhone(raw?: string | null): string | null {
  if (!raw) return null;
  let d = String(raw).replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 10) d = '91' + d;
  return d.length === 12 && d.startsWith('91') ? d : null;
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

@Injectable()
export class BorzoProvider implements DeliveryProviderInterface {
  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
  ) {}

  private async call(method: 'GET' | 'POST', path: string, body?: any): Promise<any> {
    const token = process.env.BORZO_AUTH_TOKEN;
    if (!token) throw new BadRequestException('BORZO_AUTH_TOKEN is not configured');
    const base = process.env.BORZO_API_URL || DEFAULT_BORZO_URL;
    const res = await fetch(base + path, {
      method,
      headers: { 'X-DV-Auth-Token': token, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data: any = await res.json().catch(() => null);
    if (!res.ok || !data || data.is_successful === false) {
      throw new BadRequestException('Borzo ' + path + ' failed: ' + JSON.stringify(data));
    }
    return data;
  }

  private async getPickup(): Promise<any> {
    const setting = await this.prisma.setting.findUnique({ where: { key: 'pickup_address' } });
    if (!setting) throw new BadRequestException('pickup_address setting is not configured');
    return JSON.parse(setting.value);
  }

  private addressString(a: { fullAddress: string; city: string; state: string; pincode: string }): string {
    return a.fullAddress + ', ' + a.city + ', ' + a.state + ' ' + a.pincode;
  }

  // Turns a Borzo order object into the same {status, data} shape the Uber
  // code path uses, so DeliveryService.applyProviderUpdate can be reused.
  normalizeOrder(o: any): { status: string; data: any } {
    const pts: any[] = Array.isArray(o && o.points) ? o.points : [];
    const pickupPt: any = pts[0] || {};
    const dropPt: any = pts[pts.length - 1] || {};
    const c = o && o.courier;
    const data: any = {};
    if (dropPt.tracking_url) data.tracking_url = dropPt.tracking_url;
    if (c) {
      data.courier = { name: [c.name, c.surname].filter(Boolean).join(' '), phone: c.phone };
    }
    if (dropPt.estimated_arrival_datetime) data.dropoff_eta = dropPt.estimated_arrival_datetime;
    if (pickupPt.estimated_arrival_datetime) data.pickup_eta = pickupPt.estimated_arrival_datetime;

    // Borzo's order-level status ("available"/"active") doesn't distinguish
    // "courier assigned but not moved yet" from "en route to dropoff" - both
    // are just "active". The drop point's own delivery.status is more
    // granular (planned / courier_assigned / active / finished / canceled),
    // so prefer that; fall back to order-level status if it's missing.
    const orderStatus = String((o && o.status) || '').toLowerCase();
    const deliveryStatus = String((dropPt.delivery && dropPt.delivery.status) || '').toLowerCase();
    let status = '';
    if (deliveryStatus === 'courier_assigned') status = 'pickup';
    else if (deliveryStatus === 'active') status = 'dropoff';
    else if (deliveryStatus === 'finished') status = 'delivered';
    else if (orderStatus === 'completed') status = 'delivered';
    else if (deliveryStatus === 'canceled' || orderStatus === 'canceled' || orderStatus === 'cancelled') status = 'canceled';
    else if (!deliveryStatus && orderStatus === 'active') status = 'pickup';
    return { status, data };
  }

  async createDelivery(orderId: string): Promise<DeliveryProviderResult> {
    const order: any = await this.ordersService.findOne(orderId);
    const pickup = await this.getPickup();
    const address = order.address;
    if (!address) throw new BadRequestException('Order has no delivery address loaded');

    const pickupPhone = toBorzoPhone(pickup.phone);
    if (!pickupPhone) throw new BadRequestException('pickup_address.phone is missing or not a valid Indian number');
    const customerPhone = toBorzoPhone(order.user && order.user.phone);
    if (!customerPhone) throw new BadRequestException('Customer phone number is missing or not a valid Indian number');

    const itemNames = (order.items || []).map((i: any) => i.productName + ' x' + i.quantity).join(', ');
    const deliveryMinutes = Number(process.env.BORZO_DELIVERY_MINUTES || 75);

    const pickupPoint: any = {
      address: pickup.street + ', ' + pickup.city + ', ' + pickup.state + ' ' + pickup.zip,
      contact_person: { phone: pickupPhone, name: 'Green Pizzeria' },
      note: 'Collect order ' + order.orderNumber + ' at the counter',
      required_start_datetime: istStamp(2),
      required_finish_datetime: istStamp(35),
    };
    if (pickup.latitude != null && pickup.longitude != null) {
      pickupPoint.latitude = String(pickup.latitude);
      pickupPoint.longitude = String(pickup.longitude);
    }

    const dropPoint: any = {
      address: this.addressString(address),
      contact_person: { phone: customerPhone, name: (order.user && order.user.name) || 'Customer' },
      client_order_id: String(order.orderNumber).slice(0, 32),
      note: address.landmark ? 'Landmark: ' + address.landmark : undefined,
      required_start_datetime: istStamp(2),
      required_finish_datetime: istStamp(deliveryMinutes),
    };
    if (address.latitude != null && address.longitude != null) {
      dropPoint.latitude = String(address.latitude);
      dropPoint.longitude = String(address.longitude);
    }

    const body: any = {
      matter: ('Hot pizza (food): ' + (itemNames || 'Pizza order')).slice(0, 400),
      vehicle_type_id: 8,
      is_contact_person_notification_enabled: true,
      is_thermobox_required: process.env.BORZO_THERMOBOX === 'true',
      points: [pickupPoint, dropPoint],
    };
    if (process.env.BORZO_PAYMENT_METHOD) body.payment_method = process.env.BORZO_PAYMENT_METHOD;

    const data = await this.call('POST', '/create-order', body);
    const pts: any[] = (data.order && data.order.points) || [];
    const last: any = pts[pts.length - 1] || {};
    return {
      providerDeliveryId: String(data.order.order_id),
      trackingUrl: last.tracking_url || undefined,
    };
  }

  async getDeliveryStatus(providerDeliveryId: string): Promise<{ status: string; data: any }> {
    const data = await this.call('GET', '/orders?order_id=' + encodeURIComponent(providerDeliveryId));
    const order = (data.orders && data.orders[0]) || data.order;
    if (!order) throw new BadRequestException('Borzo order not found: ' + providerDeliveryId);
    return this.normalizeOrder(order);
  }

  async cancelDelivery(providerDeliveryId: string): Promise<void> {
    await this.call('POST', '/cancel-order', { order_id: Number(providerDeliveryId) });
  }

  // Same return shape as UberDirectProvider.getQuote so checkout can use either.
  async getQuote(dropoffAddress: {
    fullAddress: string;
    city: string;
    state: string;
    pincode: string;
    latitude?: number | null;
    longitude?: number | null;
  }): Promise<
    | { deliverable: true; fee: number; currency: string; quoteId: string; expiresAt: string }
    | { deliverable: false; reason: string }
  > {
    const pickup = await this.getPickup();
    const phone = toBorzoPhone(pickup.phone) || '918880000001';
    const dropPoint: any = {
      address: this.addressString(dropoffAddress),
      contact_person: { phone },
    };
    if (dropoffAddress.latitude != null && dropoffAddress.longitude != null) {
      dropPoint.latitude = String(dropoffAddress.latitude);
      dropPoint.longitude = String(dropoffAddress.longitude);
    }

    let data: any;
    try {
      data = await this.call('POST', '/calculate-order', {
        matter: 'Hot pizza (food)',
        vehicle_type_id: 8,
        points: [
          {
            address: pickup.street + ', ' + pickup.city + ', ' + pickup.state + ' ' + pickup.zip,
            contact_person: { phone },
          },
          dropPoint,
        ],
      });
    } catch (e) {
      return { deliverable: false, reason: 'quote_failed' };
    }

    const pts: any[] = (data.order && data.order.points) || [];
    const a: any = pts[0] || {};
    const b: any = pts[pts.length - 1] || {};
    if (a.latitude == null || b.latitude == null) return { deliverable: false, reason: 'address_not_found' };

    // Straight-line distance x 1.3 is a rough estimate of the road distance.
    const maxKm = Number(process.env.BORZO_MAX_KM || 24);
    const roadKm = distanceKm(Number(a.latitude), Number(a.longitude), Number(b.latitude), Number(b.longitude)) * 1.3;
    if (roadKm > maxKm) return { deliverable: false, reason: 'out_of_range' };

    return {
      deliverable: true,
      fee: Math.round(Number(data.order.payment_amount)),
      currency: 'INR',
      quoteId: String(data.order.order_id || 'borzo'),
      expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
    };
  }
}