import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { CheckoutService } from './checkout.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('checkout')
export class CheckoutController {
  constructor(private checkoutService: CheckoutService) {}

  @Post()
  async checkout(
    @Req() req: Request & { user: { userId: string } },
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.checkoutService.checkout(req.user.userId, dto);
  }

  @Post('delivery-quote')
  async getDeliveryQuote(
    @Req() req: Request & { user: { userId: string } },
    @Body() dto: { addressId: string },
  ) {
    return this.checkoutService.getDeliveryQuote(req.user.userId, dto.addressId);
  }
}
