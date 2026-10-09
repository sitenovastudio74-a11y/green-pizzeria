import { Module } from '@nestjs/common';
import { AddonGroupAdminService } from './addon-group-admin.service';
import { AddonGroupAdminController } from './addon-group-admin.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [AddonGroupAdminService],
  controllers: [AddonGroupAdminController],
})
export class AddonGroupAdminModule {}