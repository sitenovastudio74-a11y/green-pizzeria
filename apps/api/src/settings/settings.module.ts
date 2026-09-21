import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { PublicSettingsController } from './public-settings.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [SettingsService],
  controllers: [SettingsController, PublicSettingsController],
  exports: [SettingsService],
})
export class SettingsModule {}
