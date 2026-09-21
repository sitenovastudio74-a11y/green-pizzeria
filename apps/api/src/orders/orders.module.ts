import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { MyOrdersController } from './my-orders.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [OrdersService],
  controllers: [OrdersController, MyOrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
