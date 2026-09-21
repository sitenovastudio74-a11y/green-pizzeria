import { Module } from '@nestjs/common';
import { OrderCleanupService } from './order-cleanup.service';

@Module({
  providers: [OrderCleanupService],
})
export class OrderCleanupModule {}
