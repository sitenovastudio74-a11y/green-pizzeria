import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { DeliveryService } from './delivery.service';
import { AssignRiderDto } from './dto/assign-rider.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.STAFF, Role.MANAGER)
@Controller('delivery')
export class DeliveryController {
  constructor(private deliveryService: DeliveryService) {}

  @Post('order/:orderId')
  createForOrder(@Param('orderId') orderId: string) {
    return this.deliveryService.createForOrder(orderId);
  }

  @Get('order/:orderId')
  findByOrder(@Param('orderId') orderId: string) {
    return this.deliveryService.findByOrder(orderId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.deliveryService.findOne(id);
  }

  @Patch(':id/assign-rider')
  assignRider(@Param('id') id: string, @Body() dto: AssignRiderDto) {
    return this.deliveryService.assignRider(id, dto.courierName, dto.courierPhone);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateDeliveryStatusDto) {
    return this.deliveryService.updateStatus(id, dto.status, dto.failureReason);
  }
}
