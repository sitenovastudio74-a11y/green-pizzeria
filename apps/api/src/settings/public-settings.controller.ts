import { Controller, Get } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('public-settings')
export class PublicSettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get('delivery-info')
  async getDeliveryInfo() {
    const deliveryFee = await this.settingsService.getValueOrDefault('delivery_fee', '40');
    const taxRatePercent = await this.settingsService.getValueOrDefault('tax_rate_percent', '5');
    return {
      deliveryFee: Number(deliveryFee),
      taxRatePercent: Number(taxRatePercent),
    };
  }

  @Get('store-status')
  async getStoreStatus() {
    const raw = await this.settingsService.getValueOrDefault('store_status', '{"isOpen":true,"message":""}');
    try {
      const parsed = JSON.parse(raw);
      return {
        isOpen: parsed.isOpen !== false || (typeof parsed.reopenAt === 'string' && Date.parse(parsed.reopenAt) <= Date.now()),
        message: typeof parsed.message === 'string' ? parsed.message : '',
        reopenAt: typeof parsed.reopenAt === 'string' ? parsed.reopenAt : null,
      };
    } catch {
      return { isOpen: true, message: '' };
    }
  }
}
