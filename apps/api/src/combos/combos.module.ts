import { Module } from '@nestjs/common';
import { CombosService } from './combos.service';
import { CombosController } from './combos.controller';
import { AuthModule } from '../auth/auth.module';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [AuthModule, PricingModule],
  providers: [CombosService],
  controllers: [CombosController],
})
export class CombosModule {}
