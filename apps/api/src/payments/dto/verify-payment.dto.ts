import { IsUUID, IsString } from 'class-validator';

export class VerifyPaymentDto {
  @IsUUID()
  orderId: string;

  @IsString()
  razorpayOrderId: string;

  @IsString()
  razorpayPaymentId: string;

  @IsString()
  razorpaySignature: string;
}
