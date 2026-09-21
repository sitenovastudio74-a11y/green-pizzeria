export interface CreatePaymentOrderResult {
  providerOrderId: string;
  amount: number;
  currency: string;
}

export interface VerifyPaymentInput {
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
}

export interface PaymentProviderInterface {
  createOrder(amount: number, receiptId: string): Promise<CreatePaymentOrderResult>;
  verifyPaymentSignature(input: VerifyPaymentInput): boolean;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
}
