import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { AuthModule } from '../auth/auth.module';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [AuthModule, PricingModule],
  providers: [ProductsService],
  controllers: [ProductsController],
})
export class ProductsModule {}
