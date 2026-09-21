import { Injectable } from '@nestjs/common';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import {
  PaymentProviderInterface,
  CreatePaymentOrderResult,
  VerifyPaymentInput,
} from '../interfaces/payment-provider.interface';

@Injectable()
export class RazorpayProvider implements PaymentProviderInterface {
  private client: Razorpay;

  constructor() {
    this.client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID as string,
      key_secret: process.env.RAZORPAY_KEY_SECRET as string,
    });
  }

  async createOrder(amount: number, receiptId: string): Promise<CreatePaymentOrderResult> {
    // Razorpay expects amount in paise (smallest currency unit), not rupees
    const amountInPaise = Math.round(amount * 100);

    const order = await this.client.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: receiptId,
    });

    return {
      providerOrderId: order.id,
      amount: amount,
      currency: 'INR',
    };
  }

  verifyPaymentSignature(input: VerifyPaymentInput): boolean {
    const body = input.providerOrderId + '|' + input.providerPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
      .update(body)
      .digest('hex');

    return expectedSignature === input.signature;
  }

  // Webhook signature verification uses a SEPARATE secret from the API
  // key_secret above. RAZORPAY_WEBHOOK_SECRET is generated in the Razorpay
  // Dashboard when the webhook URL is registered, and must be set in .env
  // before webhooks will verify correctly.
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('RAZORPAY_WEBHOOK_SECRET is not set');
    }
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    return expectedSignature === signature;
  }
}
