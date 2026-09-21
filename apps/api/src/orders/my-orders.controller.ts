import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('my-orders')
export class MyOrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  findMyOrders(@Req() req: Request) {
    const userId = (req as any).user.userId;
    return this.ordersService.findAllForUser(userId);
  }

  @Get(':id')
  findMyOrder(@Req() req: Request, @Param('id') id: string) {
    const userId = (req as any).user.userId;
    return this.ordersService.findOneForUser(userId, id);
  }
}
