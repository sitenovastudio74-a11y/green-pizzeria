import { Controller, Post, Body, Req, Headers, UseGuards, BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create-order')
  createOrder(@Req() req: Request, @Body() dto: CreatePaymentOrderDto) {
    const userId = (req as any).user.userId;
    return this.paymentsService.createRazorpayOrder(userId, dto.orderId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify')
  verify(@Req() req: Request, @Body() dto: VerifyPaymentDto) {
    const userId = (req as any).user.userId;
    return this.paymentsService.verifyPayment(
      userId,
      dto.orderId,
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );
  }

  // No JwtAuthGuard here ? Razorpay's servers call this, not a logged-in user.
  // Security comes from signature verification instead.
  @Post('webhook')
  webhook(@Req() req: Request, @Headers('x-razorpay-signature') signature: string) {
    if (!signature) {
      throw new BadRequestException('Missing signature header');
    }
    const rawBody = (req as any).body.toString('utf8');
    return this.paymentsService.handleWebhook(rawBody, signature);
  }
}
