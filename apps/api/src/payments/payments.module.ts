import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { RazorpayProvider } from './providers/razorpay.provider';
import { AuthModule } from '../auth/auth.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [AuthModule, OrdersModule],
  providers: [PaymentsService, RazorpayProvider],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
